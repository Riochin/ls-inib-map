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
  MAX_BUSINESS_HOURS,
  MAX_FLOOR,
  MAX_CORRECTION_NOTE,
  type ReportInput,
  type ReportType,
  type FeedbackInput,
  type FeedbackCategory,
  type StructuredStoreInput,
  type CorrectionType,
} from '@/lib/report'
import type { TernaryState } from '@/types/store'

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
const MAX_PAYMENTS_COUNT = 20
const MAX_PAYMENT_ITEM_LEN = 30

const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  '新機能の提案',
  '既存機能の改善',
  '不具合',
  'その他',
]
const TERNARY_VALUES: readonly TernaryState[] = ['yes', 'no', 'unknown']
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

function validateStructuredStore(r: Record<string, unknown>): StructuredStoreInput | null {
  const trimStr = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''

  const storeId = trimStr(r.storeId, MAX_STORE_FIELD_LEN)
  const storeName = trimStr(r.storeName, MAX_STORE_FIELD_LEN)
  const storeAddress = trimStr(r.storeAddress, MAX_STORE_FIELD_LEN)

  let machineCountsJojoLs: number | undefined
  if (r.machineCountsJojoLs !== undefined) {
    const v = Number(r.machineCountsJojoLs)
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0 || v > 99) return null
    machineCountsJojoLs = v
  }

  let machineCountsGundamExvs: number | undefined
  if (r.machineCountsGundamExvs !== undefined) {
    const v = Number(r.machineCountsGundamExvs)
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0 || v > 99) return null
    machineCountsGundamExvs = v
  }

  const businessHours = trimStr(r.businessHours, MAX_BUSINESS_HOURS) || undefined
  const floorJojoLs = trimStr(r.floorJojoLs, MAX_FLOOR) || undefined
  const floorGundamExvs = trimStr(r.floorGundamExvs, MAX_FLOOR) || undefined

  const smoking = TERNARY_VALUES.includes(r.smoking as TernaryState)
    ? (r.smoking as TernaryState)
    : undefined

  let payments: string[] | undefined
  if (Array.isArray(r.payments)) {
    if (r.payments.length > MAX_PAYMENTS_COUNT) return null
    for (const p of r.payments) {
      if (typeof p !== 'string' || p.length > MAX_PAYMENT_ITEM_LEN) return null
    }
    const filtered = r.payments.filter((p): p is string => typeof p === 'string' && p.length > 0)
    payments = filtered.length > 0 ? filtered : undefined
  }

  const ternary = (v: unknown): TernaryState | undefined =>
    TERNARY_VALUES.includes(v as TernaryState) ? (v as TernaryState) : undefined

  const hasRecordingJojoLs = ternary(r.hasRecordingJojoLs)
  const hasRecordingGundamExvs = ternary(r.hasRecordingGundamExvs)
  const hasStreamingJojoLs = ternary(r.hasStreamingJojoLs)
  const hasStreamingGundamExvs = ternary(r.hasStreamingGundamExvs)

  const correctionType = CORRECTION_TYPES.includes(r.correctionType as CorrectionType)
    ? (r.correctionType as CorrectionType)
    : undefined

  const correctionNote = trimStr(r.correctionNote, MAX_CORRECTION_NOTE) || undefined

  // 全属性フィールドが未入力なら拒否（Req 4.9）
  const hasAnyInput = [
    machineCountsJojoLs,
    machineCountsGundamExvs,
    businessHours,
    floorJojoLs,
    floorGundamExvs,
    smoking,
    payments,
    hasRecordingJojoLs,
    hasRecordingGundamExvs,
    hasStreamingJojoLs,
    hasStreamingGundamExvs,
    correctionType,
    correctionNote,
  ].some((v) => v !== undefined)
  if (!hasAnyInput) return null

  const reporter = trimStr(r.reporter, MAX_REPORTER) || undefined

  return {
    storeId,
    storeName,
    storeAddress,
    reporter,
    noMention: r.noMention === true,
    machineCountsJojoLs,
    machineCountsGundamExvs,
    businessHours,
    floorJojoLs,
    floorGundamExvs,
    smoking,
    payments,
    hasRecordingJojoLs,
    hasRecordingGundamExvs,
    hasStreamingJojoLs,
    hasStreamingGundamExvs,
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
