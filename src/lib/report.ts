/**
 * アプリ内投稿フォームの共有ロジック（クライアント/サーバー両用・純粋）。
 *
 * 報告種別の選択肢と、GitHub Issue 本文の組み立てをここに集約し、フォーム（client）と
 * API ルート（server）でズレないようにする。実際の Issue 作成・検証は API ルート側。
 */

import type { GameTitle, TernaryState } from '@/types/store'
import type { OverrideEntry } from '@/types/overrides'
import {
  GAME_TITLES,
  REPORTABLE_ATTRIBUTES,
  TERNARY_LABELS,
  readAttribute,
  type AttributeDataKey,
  type AttributeDef,
} from '@/lib/store-attributes'
import { getGameLabel } from '@/lib/marker-color'

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

/**
 * Markdown テーブルのセル用エスケープ。セル区切りの `|` を無効化（`\|`）し、改行を空白へ
 * 潰すことで、ユーザー入力（特に複数行のメモ）によるテーブル崩れ・余計なMarkdown混入を防ぐ。
 */
function escapeTableCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r\n|[\r\n]/g, ' ')
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

/**
 * 提供フォームで送る店舗属性。`OverrideEntry` と同じ形（ゲーム別はマップ）で、
 * フォーム → API → Issue → 自動反映 → overrides.json を同じ形で流す（ADR-0005）。
 * 受け付ける属性・上限は属性レジストリ（`@/lib/store-attributes`）の `reportable` 項目。
 */
export type StructuredAttributes = Partial<Pick<OverrideEntry, AttributeDataKey>>

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
  /** ゲーム別台数（各 0〜99 の整数）。出どころは countSources で別管理のためレジストリ外 */
  machineCounts?: Partial<Record<GameTitle, number>>
  /** 店舗属性（入力済みのものだけ） */
  attributes?: StructuredAttributes
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

/** 台数行のラベル（過去の Issue と自動反映の指示文が依存するため変えない） */
const MACHINE_COUNT_LABELS: Record<GameTitle, string> = {
  'jojo-ls': 'ジョジョ台数',
  'gundam-exvs': 'イニブ台数',
}

/** 提案値表の1セル分の値。空のリストなど行を作らない値は undefined。 */
function formatProposal(def: AttributeDef, value: unknown, cell: (v: string) => string): string | undefined {
  if (value === undefined) return undefined
  switch (def.kind) {
    case 'ternary':
      return TERNARY_LABELS[value as TernaryState]
    case 'text':
      return cell(value as string)
    case 'number':
      return String(value)
    case 'list': {
      const items = value as string[]
      return items.length > 0 ? items.map(cell).join(', ') : undefined
    }
  }
}

/**
 * 属性1つ分の提案値行。店単位は「ラベル」、ゲーム別は「ラベル（ラスサバ）」の行をゲームごとに作る。
 * `collapseSameValue` の属性（フロア）は全ゲームが同じ値なら「ラベル」1行にまとめる。
 */
function proposalRows(def: AttributeDef, value: unknown, cell: (v: string) => string): string[] {
  if (def.scope === 'store') {
    const v = formatProposal(def, value, cell)
    return v === undefined ? [] : [`| ${def.label} | ${v} |`]
  }
  const byGame = (value ?? {}) as Partial<Record<GameTitle, unknown>>
  const values = GAME_TITLES.map((game) => ({ game, v: formatProposal(def, byGame[game], cell) }))
  const present = values.filter((x): x is { game: GameTitle; v: string } => x.v !== undefined)
  if (
    def.collapseSameValue &&
    present.length === GAME_TITLES.length &&
    present.every((x) => x.v === present[0].v)
  ) {
    return [`| ${def.label} | ${present[0].v} |`]
  }
  return present.map((x) => `| ${def.label}（${getGameLabel(x.game)}） | ${x.v} |`)
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

  // 提案値一覧（入力済みフィールドのみ）。ユーザー入力はテーブルセル用にエスケープする
  const cell = (v: string) => escapeTableCell(safe(v))
  const rows: string[] = []
  for (const game of GAME_TITLES) {
    const count = input.machineCounts?.[game]
    if (count !== undefined) rows.push(`| ${MACHINE_COUNT_LABELS[game]} | ${count} |`)
  }
  const attributes = input.attributes ?? {}
  for (const def of REPORTABLE_ATTRIBUTES) {
    rows.push(...proposalRows(def, readAttribute(attributes, def), cell))
  }
  if (input.correctionType !== undefined)
    rows.push(`| 修正・通報種別 | ${input.correctionType} |`)
  if (input.correctionNote !== undefined && input.correctionNote.trim())
    rows.push(`| 修正・通報メモ | ${cell(input.correctionNote)} |`)

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
