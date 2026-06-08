import type { StoresMeta } from '@/types/stores-file'

/**
 * データ出典（公式2サイト）の既定URL。
 * メタ情報（{@link StoresMeta.source}）が無い場合のフォールバックとして用い、
 * クレジット表示（Req6.4）が常設されることを保証する。
 */
export const DEFAULT_DATA_SOURCE: StoresMeta['source'] = {
  jojols: 'https://bandainamco-am.co.jp/am/vg/jojols/location/',
  gundam: 'https://gundam-vs.jp/extreme/ac2ib/location/',
}

/**
 * 店舗件数の表示ラベルを組み立てる（Req4.1, 4.2）。
 * - 非フィルタ時: 総数のみ（`全 N 件`）
 * - フィルタ時: 絞り込み数と総数（`M / N 件`）
 */
export function buildCountLabel(total: number, filtered: number, isFiltered: boolean): string {
  return isFiltered ? `${filtered} / ${total} 件` : `全 ${total} 件`
}

/**
 * ISO 8601 の最終更新日時を日本のユーザー向け文字列に整形する（Req5.3）。
 * 不正・空文字の場合は null を返す（メタ欠落時のグレースフルデグラデーション）。
 *
 * 日本向けサービスのため表示は常に JST 固定。タイムゾーンを指定しないと
 * SSR（UTC サーバー）とクライアント（閲覧者ローカル）で文字列が食い違い、
 * ハイドレーション不一致や時刻ずれを起こすため `Asia/Tokyo` を明示する。
 */
export function formatLastUpdated(iso: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(date)
}
