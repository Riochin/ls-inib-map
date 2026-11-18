import { NextResponse } from 'next/server'
import { normalizeTextBasics } from '@/lib/text-normalize'
import { ratelimit, getClientIp } from '@/lib/rate-limit'
import {
  REPORT_TYPES,
  buildReportIssue,
  buildFeedbackIssue,
  buildStructuredStoreIssue,
  FEEDBACK_LABEL,
  MAX_CONTENT,
  MAX_REPORTER,
  MAX_STORE_FIELD_LEN,
  MAX_CORRECTION_NOTE,
  type ReportInput,
  type ReportType,
  type FeedbackInput,
  type FeedbackCategory,
  type StructuredStoreInput,
  type StructuredAttributes,
  type CorrectionType,
} from '@/lib/report'
import {
  GAME_TITLES,
  REPORTABLE_ATTRIBUTES,
  TERNARY_VALUES,
  type AttributeDef,
} from '@/lib/store-attributes'
import type { GameTitle, TernaryState } from '@/types/store'

/**
 * 公開API: アプリ内投稿フォームの受け口（mode による3モード対応）。
 *
 * - mode=feedback        → アプリ要望フォーム（label: アプリ要望）
 * - mode=structured-store → 構造化店舗情報提供フォーム（label: ユーザー報告）
 * - mode=undefined       → legacy 報告フォーム（後方互換）
 *
 * honeypot・環境変数チェックは mode 不問で先行適用。
 */

export const dynamic = 'force-dynamic'

const REPORT_LABEL = 'ユーザー報告'
/** 台数の検証規則（レジストリ外。属性と同じ数値検証を使う） */
const MACHINE_COUNT_RULE: Pick<AttributeDef, 'kind' | 'min' | 'max'> = { kind: 'number', min: 0, max: 99 }

const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  '新機能の提案',
  '既存機能の改善',
  '不具合',
  'その他',
]
const CORRECTION_TYPES: readonly CorrectionType[] = ['位置ズレ', '閉店・移設']

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const r = (body ?? {}) as Record<string, unknown>

  // honeypot: 何か入っていれば bot とみなし、成功を装って静かに破棄
  if (typeof r.website === 'string' && r.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  // レート制限: IP ベースで 10 リクエスト / 10分
  if (ratelimit) {
    const ip = getClientIp(request)
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json(
        { error: '送信が多すぎます。しばらく待ってから再度お試しください。' },
        { status: 429 },
      )
    }
  }

  const token = process.env.GITHUB_REPORT_TOKEN
  const repo = process.env.GITHUB_REPORT_REPO
  if (!token || !repo) {
    return NextResponse.json({ error: 'サーバー設定が未完了です。' }, { status: 503 })
  }

  const mode = r.mode

  if (mode === 'feedback') {
    const input = validateFeedback(r)
    if (!input) {
      return NextResponse.json({ error: '入力が正しくありません。' }, { status: 400 })
    }
    const { title, body: issueBody } = buildFeedbackIssue(input)
    return postIssue(token, repo, title, issueBody, FEEDBACK_LABEL, '[report:feedback]')
  }

  if (mode === 'structured-store') {
    const input = validateStructuredStore(r)
    if (!input) {
      return NextResponse.json({ error: '入力が正しくありません。' }, { status: 400 })
    }
    const { title, body: issueBody } = buildStructuredStoreIssue(input)
    return postIssue(token, repo, title, issueBody, REPORT_LABEL, '[report:structured-store]')
  }

  if (mode !== undefined) {
    return NextResponse.json({ error: '入力が正しくありません。' }, { status: 400 })
  }

  // legacy パス（mode 未指定）: 後方互換として維持
  const input = validateReport(r)
  if (!input) {
    return NextResponse.json({ error: '入力が正しくありません。' }, { status: 400 })
  }
  const { title, body: issueBody } = buildReportIssue(input)
  return postIssue(token, repo, title, issueBody, REPORT_LABEL, '[report]')
}

async function postIssue(
  token: string,
  repo: string,
  title: string,
  issueBody: string,
  label: string,
  logPrefix: string,
): Promise<NextResponse> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ls-inib-map-report',
      },
      body: JSON.stringify({ title, body: issueBody, labels: [label] }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`${logPrefix} GitHub API ${res.status} ${res.statusText}: ${detail}`)
      return NextResponse.json(
        { error: '送信に失敗しました。時間をおいて再度お試しください。' },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error(`${logPrefix} GitHub API への送信に失敗:`, err)
    return NextResponse.json(
      { error: '送信に失敗しました。時間をおいて再度お試しください。' },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true })
}

function validateFeedback(r: Record<string, unknown>): FeedbackInput | null {
  if (!FEEDBACK_CATEGORIES.includes(r.category as FeedbackCategory)) return null
  const content = typeof r.content === 'string' ? r.content.trim().slice(0, MAX_CONTENT) : ''
  if (!content) return null
  const reporter = typeof r.reporter === 'string' ? r.reporter.trim().slice(0, MAX_REPORTER) : ''
  return {
    category: r.category as FeedbackCategory,
    content,
    reporter: reporter || undefined,
    noMention: r.noMention === true,
  }
}

/** 値が不正で、リクエストごと拒否すべきことを表す */
const INVALID = Symbol('invalid')

/**
 * 属性の値1つ（ゲーム別は1ゲーム分）を種類と上限で検証する。
 * - text: trim して上限で切る。空は未入力
 * - ternary: 不正値は未入力として無視
 * - number: 非整数・範囲外は拒否
 * - list: 件数超過・要素の型/長さ違反は拒否。空要素を除いて空なら未入力
 */
function validateValue(
  rule: Pick<AttributeDef, 'kind' | 'maxLength' | 'maxItems' | 'itemMaxLength' | 'min' | 'max'>,
  v: unknown,
): unknown {
  switch (rule.kind) {
    case 'text':
      return typeof v === 'string' ? v.trim().slice(0, rule.maxLength) || undefined : undefined
    case 'ternary':
      return TERNARY_VALUES.includes(v as TernaryState) ? v : undefined
    case 'number': {
      if (v === undefined) return undefined
      const n = Number(v)
      if (!Number.isInteger(n)) return INVALID
      if (rule.min !== undefined && n < rule.min) return INVALID
      if (rule.max !== undefined && n > rule.max) return INVALID
      return n
    }
    case 'list': {
      if (!Array.isArray(v)) return undefined
      if (rule.maxItems !== undefined && v.length > rule.maxItems) return INVALID
      for (const item of v) {
        if (typeof item !== 'string') return INVALID
        if (rule.itemMaxLength !== undefined && item.length > rule.itemMaxLength) return INVALID
      }
      const filtered = (v as string[]).filter((item) => item.length > 0)
      return filtered.length > 0 ? filtered : undefined
    }
  }
}

/** ゲーム別の値を検証する。オブジェクト以外は未入力、既知のゲームのキーだけを残す。 */
function validateByGame(
  rule: Parameters<typeof validateValue>[0],
  v: unknown,
): Partial<Record<GameTitle, unknown>> | undefined | typeof INVALID {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined
  const out: Partial<Record<GameTitle, unknown>> = {}
  for (const game of GAME_TITLES) {
    const value = validateValue(rule, (v as Record<string, unknown>)[game])
    if (value === INVALID) return INVALID
    if (value !== undefined) out[game] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** 報告できる属性（レジストリの reportable 項目）だけを検証して取り出す。不正なら null。 */
function validateAttributes(raw: unknown): StructuredAttributes | null {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const def of REPORTABLE_ATTRIBUTES) {
    const value =
      def.scope === 'game' ? validateByGame(def, src[def.key]) : validateValue(def, src[def.key])
    if (value === INVALID) return null
    if (value !== undefined) out[def.key] = value
  }
  return out as StructuredAttributes
}

function validateStructuredStore(r: Record<string, unknown>): StructuredStoreInput | null {
  const trimStr = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''

  const storeId = trimStr(r.storeId, MAX_STORE_FIELD_LEN)
  const storeName = trimStr(r.storeName, MAX_STORE_FIELD_LEN)
  const storeAddress = trimStr(r.storeAddress, MAX_STORE_FIELD_LEN)

  const machineCounts = validateByGame(MACHINE_COUNT_RULE, r.machineCounts)
  if (machineCounts === INVALID) return null

  const attributes = validateAttributes(r.attributes)
  if (attributes === null) return null

  const correctionType = CORRECTION_TYPES.includes(r.correctionType as CorrectionType)
    ? (r.correctionType as CorrectionType)
    : undefined

  const correctionNote = trimStr(r.correctionNote, MAX_CORRECTION_NOTE) || undefined

  // 全属性フィールドが未入力なら拒否（Req 4.9）
  const hasAnyInput =
    machineCounts !== undefined ||
    Object.keys(attributes).length > 0 ||
    correctionType !== undefined ||
    correctionNote !== undefined
  if (!hasAnyInput) return null

  const reporter = trimStr(r.reporter, MAX_REPORTER) || undefined

  return {
    storeId,
    storeName,
    storeAddress,
    reporter,
    noMention: r.noMention === true,
    machineCounts: machineCounts as Partial<Record<GameTitle, number>> | undefined,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    correctionType,
    correctionNote,
  }
}

function validateReport(r: Record<string, unknown>): ReportInput | null {
  const trimmed = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const storeId = trimmed(r.storeId, MAX_STORE_FIELD_LEN)
  const storeName = trimmed(r.storeName, MAX_STORE_FIELD_LEN)
  const storeAddress = trimmed(r.storeAddress, MAX_STORE_FIELD_LEN)
  if (!storeId || !storeName) return null
  if (!REPORT_TYPES.includes(r.type as ReportType)) return null
  const text = normalizeTextBasics(typeof r.text === 'string' ? r.text : '').slice(0, MAX_CONTENT)
  if (!text) return null
  const reporter = trimmed(r.reporter, MAX_REPORTER)
  return {
    storeId,
    storeName,
    storeAddress,
    type: r.type as ReportType,
    text,
    reporter: reporter || undefined,
    noMention: r.noMention === true,
  }
}
