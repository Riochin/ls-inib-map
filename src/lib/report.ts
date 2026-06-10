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
  /** 報告者名（任意） */
  reporter?: string
}

export interface ReportIssue {
  title: string
  body: string
}

/** 報告内容を GitHub Issue（タイトル・本文）へ整形する。手動トリアージで人が読む体裁。 */
export function buildReportIssue(r: ReportInput): ReportIssue {
  const reporter = r.reporter && r.reporter.trim() ? r.reporter.trim() : '（未記入）'
  const title = `[ユーザー報告] ${r.storeName} — ${r.type}`
  const body = [
    '[自動投稿] アプリ内「情報の修正を報告」フォームからの報告です。',
    '',
    `- store-id: ${r.storeId}`,
    `- 店名: ${r.storeName}`,
    `- 住所: ${r.storeAddress}`,
    `- 報告種別: ${r.type}`,
    `- 報告者: ${reporter}`,
    '',
    '## メモ（原文）',
    r.text,
  ].join('\n')
  return { title, body }
}
