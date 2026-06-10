import { NextResponse } from 'next/server'
import { normalizeTextBasics } from '@/lib/text-normalize'
import { REPORT_TYPES, buildReportIssue, type ReportInput, type ReportType } from '@/lib/report'

/**
 * 公開API: アプリ内「情報の修正を報告」フォームの受け口。
 *
 * - /api/overrides と違い**本番でも動く**（一般ユーザーが投稿する）。NODE_ENV ガードは使わない。
 * - bot対策の honeypot（`website`）＋各フィールドの長さ上限。スパムは label-gate（手動トリアージ）と併用。
 * - 検証OKなら GitHub Issue（ラベル `ユーザー報告`）をサーバー専用トークンで作成する。
 *   `memo` は付けない＝自動AI構造化は起こさず、運営が手で確認して反映する運用。
 */

export const dynamic = 'force-dynamic'

const MAX_TEXT = 2000
const MAX_NAME = 80
const MAX_STORE_FIELD = 200
const REPORT_LABEL = 'ユーザー報告'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const r = (body ?? {}) as Record<string, unknown>

  // honeypot: 何か入っていれば bot とみなし、成功を装って静かに破棄（fetchしない）
  if (typeof r.website === 'string' && r.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const input = validateReport(r)
  if (!input) {
    return NextResponse.json({ error: '入力が正しくありません。' }, { status: 400 })
  }

  const token = process.env.GITHUB_REPORT_TOKEN
  const repo = process.env.GITHUB_REPORT_REPO
  if (!token || !repo) {
    return NextResponse.json({ error: 'サーバー設定が未完了です。' }, { status: 503 })
  }

  const { title, body: issueBody } = buildReportIssue(input)
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ls-inib-map-report',
      },
      body: JSON.stringify({ title, body: issueBody, labels: [REPORT_LABEL] }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[report] GitHub API ${res.status} ${res.statusText}: ${detail}`)
      return NextResponse.json(
        { error: '送信に失敗しました。時間をおいて再度お試しください。' },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error('[report] GitHub API への送信に失敗:', err)
    return NextResponse.json(
      { error: '送信に失敗しました。時間をおいて再度お試しください。' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}

/** 入力検証＋整形。型不正・必須欠落・種別ホワイトリスト外は null。 */
function validateReport(r: Record<string, unknown>): ReportInput | null {
  const trimmed = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

  const storeId = trimmed(r.storeId, MAX_STORE_FIELD)
  const storeName = trimmed(r.storeName, MAX_STORE_FIELD)
  const storeAddress = trimmed(r.storeAddress, MAX_STORE_FIELD)
  if (!storeId || !storeName) return null

  if (!REPORT_TYPES.includes(r.type as ReportType)) return null

  const text = normalizeTextBasics(typeof r.text === 'string' ? r.text : '').slice(0, MAX_TEXT)
  if (!text) return null

  const reporter = trimmed(r.reporter, MAX_NAME)

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
