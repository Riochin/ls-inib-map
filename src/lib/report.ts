/**
 * アプリ内「情報の修正を報告」フォームの共有ロジック（クライアント/サーバー両用・純粋）。
 *
 * 報告種別の選択肢と、GitHub Issue 本文の組み立てをここに集約し、フォーム（client）と
 * API ルート（server）でズレないようにする。実際の Issue 作成・検証は API ルート側。
 */

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

/** 報告内容を GitHub Issue（タイトル・本文）へ整形する。手動トリアージで人が読む体裁。 */
export function buildReportIssue(r: ReportInput): ReportIssue {
  const hasSns = !!(r.reporter && r.reporter.trim())
  const sns = hasSns ? r.reporter!.trim() : '（未記入）'
  // SNS ID の有無で、確定情報にできるか／ユーザー投稿扱いかを運営向けに明示する
  const provenance = hasSns
    ? 'SNS ID提供あり → 運営確認のうえ「確定」にできる'
    : 'SNS ID未記入 → 「みんなの報告（未確認）」扱い（確定不可）'
  // お礼ツイートのメンション可否（SNS ID提供時のみ意味を持つ）
  const mention = hasSns ? (r.noMention ? '不可（メンション希望なし）' : '可') : '—'

  const title = `[ユーザー報告] ${r.storeName} — ${r.type}`
  const body = [
    '[自動投稿] アプリ内「情報の修正を報告」フォームからの報告です。',
    '',
    `- store-id: ${r.storeId}`,
    `- 店名: ${r.storeName}`,
    `- 住所: ${r.storeAddress}`,
    `- 報告種別: ${r.type}`,
    `- SNS ID: ${sns}`,
    `- 確定可否: ${provenance}`,
    `- お礼ツイート: ${mention}`,
    '',
    '## メモ（原文）',
    r.text,
  ].join('\n')
  return { title, body }
}
