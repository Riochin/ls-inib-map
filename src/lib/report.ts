/**
 * アプリ内投稿フォームの共有ロジック（クライアント/サーバー両用・純粋）。
 *
 * 報告種別の選択肢と、GitHub Issue 本文の組み立てをここに集約し、フォーム（client）と
 * API ルート（server）でズレないようにする。実際の Issue 作成・検証は API ルート側。
 */

import type { TernaryState } from '@/types/store'

/** 報告種別の選択肢（フォームの選択肢＝サーバーのホワイトリスト） */
export const REPORT_TYPES = ['位置ズレ', '台数', '閉店・移設', 'その他'] as const
export type ReportType = (typeof REPORT_TYPES)[number]

/** フォーム送信ペイロード（honeypot `website` は別途サーバーで判定するため含めない） */
export interface ReportInput {
  storeId: string
  storeName: string
  storeAddress: string
  type: ReportType
  /** 自由記述（必須・整形済みを渡す） */
  text: string
  /**
   * 報告者の SNS ID（任意）。提供があれば運営確認のうえ「確定」情報にできる余地がある。
   * 未記入の場合は出どころを追えないため「みんなの報告（未確認）」扱いに留まる。
   */
  reporter?: string
  /** お礼ツイートでメンションされたくない（SNS ID提供時のみ意味を持つ） */
  noMention?: boolean
}

export interface ReportIssue {
  title: string
  body: string
}

/**
 * GitHub の @メンション／#Issue参照を無効化する（通知スパム防止）。
 * 公開フォーム由来の文字列を Issue 本文に載せると、`@victim` `#123` が第三者への通知や
 * 望まぬ相互リンクを発火させうるため、`@`/`#` の直後にゼロ幅スペース(U+200B)を挟んで見た目は保つ。
 */
function neutralizeMentions(s: string): string {
  return s.replace(/([@#])/g, '$1​')
}

// ─── 文字数上限定数 ───────────────────────────────────────────────
export const MAX_CONTENT = 2000
export const MAX_REPORTER = 80
export const MAX_STORE_FIELD_LEN = 200
export const MAX_BUSINESS_HOURS = 100
export const MAX_FLOOR = 50
export const MAX_CORRECTION_NOTE = 500

// ─── アプリ要望フォーム ─────────────────────────────────────────────
export const FEEDBACK_LABEL = 'アプリ要望'
export type FeedbackCategory = '新機能の提案' | '既存機能の改善' | '不具合' | 'その他'

export interface FeedbackInput {
  category: FeedbackCategory
  /** 必須・max 2000 */
  content: string
  /** SNS ID（任意・max 80） */
  reporter?: string
  noMention?: boolean
}

// ─── 構造化店舗情報提供フォーム ────────────────────────────────────
export type CorrectionType = '位置ズレ' | '閉店・移設'

export interface StructuredStoreInput {
  /** max 200 */
  storeId: string
  /** max 200 */
  storeName: string
  /** max 200 */
  storeAddress: string
  /** max 80 */
  reporter?: string
  noMention?: boolean
  machineCountsJojoLs?: number
  machineCountsGundamExvs?: number
  /** max 100 */
  businessHours?: string
  /** max 50 */
  floor?: string
  smoking?: TernaryState
  /** max 20件・各 max 30文字 */
  payments?: string[]
  hasRecording?: TernaryState
  hasStreaming?: TernaryState
  correctionType?: CorrectionType
  /** max 500 */
  correctionNote?: string
}

/** 要望内容を GitHub Issue へ整形する（buildReportIssue と同一パターン）。 */
export function buildFeedbackIssue(input: FeedbackInput): ReportIssue {
  const content = neutralizeMentions(input.content)
  const hasSns = !!(input.reporter && input.reporter.trim())
  const sns = hasSns ? neutralizeMentions(input.reporter!.trim()) : '（未記入）'
  const provenance = hasSns
    ? 'SNS ID提供あり → 確定可能'
    : 'SNS ID未記入 → 未確認（みんなの報告）扱い'
  const mention = hasSns ? (input.noMention ? '不可（メンション希望なし）' : '可') : '—'

  const title = `[アプリ要望] ${input.category} — ${input.content.slice(0, 50)}`
  const body = [
    '[自動投稿] アプリ内「要望フォーム」からの投稿です。',
    '',
    `- カテゴリ: ${input.category}`,
    `- SNS ID: ${sns}`,
    `- 確定可否: ${provenance}`,
    `- お礼リプライ: ${mention}`,
    '',
    '## 内容（原文）',
    content,
  ].join('\n')

  return { title, body }
}

const TERNARY_LABEL: Record<TernaryState, string> = {
  yes: 'あり',
  no: 'なし',
  unknown: '不明',
}

/** 構造化店舗情報を「提案値一覧」テーブル形式の GitHub Issue へ整形する。 */
export function buildStructuredStoreIssue(input: StructuredStoreInput): ReportIssue {
  const safe = (v: string) => neutralizeMentions(v)
  const storeId = safe(input.storeId)
  const storeName = safe(input.storeName)
  const storeAddress = safe(input.storeAddress)
  const hasSns = !!(input.reporter && input.reporter.trim())
  const sns = hasSns ? safe(input.reporter!.trim()) : '（未記入）'
  const provenance = hasSns
    ? 'SNS ID提供あり → 確定可能'
    : 'SNS ID未記入 → 未確認（みんなの報告）扱い'
  const mention = hasSns ? (input.noMention ? '不可（メンション希望なし）' : '可') : '—'

  // 提案値一覧（入力済みフィールドのみ）
  const rows: string[] = []
  if (input.machineCountsJojoLs !== undefined)
    rows.push(`| ジョジョ台数 | ${input.machineCountsJojoLs} |`)
  if (input.machineCountsGundamExvs !== undefined)
    rows.push(`| イニブ台数 | ${input.machineCountsGundamExvs} |`)
  if (input.businessHours !== undefined)
    rows.push(`| 営業時間 | ${safe(input.businessHours)} |`)
  if (input.floor !== undefined)
    rows.push(`| フロア | ${safe(input.floor)} |`)
  if (input.smoking !== undefined)
    rows.push(`| 喫煙所 | ${TERNARY_LABEL[input.smoking]} |`)
  if (input.payments !== undefined && input.payments.length > 0)
    rows.push(`| 決済/電子マネー | ${input.payments.map(safe).join(', ')} |`)
  if (input.hasRecording !== undefined)
    rows.push(`| 録画台 | ${TERNARY_LABEL[input.hasRecording]} |`)
  if (input.hasStreaming !== undefined)
    rows.push(`| 配信台 | ${TERNARY_LABEL[input.hasStreaming]} |`)
  if (input.correctionType !== undefined)
    rows.push(`| 修正・通報種別 | ${input.correctionType} |`)
  if (input.correctionNote !== undefined && input.correctionNote.trim())
    rows.push(`| 修正・通報メモ | ${safe(input.correctionNote)} |`)

  const table =
    rows.length > 0
      ? ['| 項目 | 提案値 |', '|------|--------|', ...rows].join('\n')
      : '（提案値なし）'

  const title = `[ユーザー報告] ${storeName} — 店舗情報の提供`
  const body = [
    '[自動投稿] アプリ内「情報を提供」フォームからの報告です。',
    '',
    `- store-id: ${storeId}`,
    `- 店名: ${storeName}`,
    `- 住所: ${storeAddress}`,
    `- SNS ID: ${sns}`,
    `- 確定可否: ${provenance}`,
    `- お礼リプライ: ${mention}`,
    '',
    '## 提案値一覧',
    table,
  ].join('\n')

  return { title, body }
}

/** 報告内容を GitHub Issue（タイトル・本文）へ整形する。手動トリアージで人が読む体裁。 */
export function buildReportIssue(r: ReportInput): ReportIssue {
  // 公開フォーム由来＝すべて攻撃者制御の可能性。本文に載る値はメンションを無効化する
  const storeId = neutralizeMentions(r.storeId)
  const storeName = neutralizeMentions(r.storeName)
  const storeAddress = neutralizeMentions(r.storeAddress)
  const text = neutralizeMentions(r.text)
  const hasSns = !!(r.reporter && r.reporter.trim())
  const sns = hasSns ? neutralizeMentions(r.reporter!.trim()) : '（未記入）'
  // SNS ID の有無で、確定情報にできるか／ユーザー投稿扱いかを運営向けに明示する
  const provenance = hasSns
    ? 'SNS ID提供あり → 運営確認のうえ「確定」にできる'
    : 'SNS ID未記入 → 「みんなの報告（未確認）」扱い（確定不可）'
  // お礼ツイートのメンション可否（SNS ID提供時のみ意味を持つ）
  const mention = hasSns ? (r.noMention ? '不可（メンション希望なし）' : '可') : '—'

  const title = `[ユーザー報告] ${storeName} — ${r.type}`
  const body = [
    '[自動投稿] アプリ内「情報の修正を報告」フォームからの報告です。',
    '',
    `- store-id: ${storeId}`,
    `- 店名: ${storeName}`,
    `- 住所: ${storeAddress}`,
    `- 報告種別: ${r.type}`,
    `- SNS ID: ${sns}`,
    `- 確定可否: ${provenance}`,
    `- お礼ツイート: ${mention}`,
    '',
    '## メモ（原文）',
    text,
  ].join('\n')
  return { title, body }
}
