import type { StoresMeta } from '@/types/stores-file'
import type { GameTitle, TernaryState } from '@/types/store'
import { getGameLabel } from '@/lib/marker-color'

const TERNARY_LABELS: Record<TernaryState, string> = {
  yes: 'あり',
  no: 'なし',
  unknown: '不明',
}

/**
 * ゲーム別の三値（録画台/配信台）を店舗詳細パネル用の文字列に整形する。
 * - 複数タイトル店: 「ラスサバ 不明 ／ イニブ あり」のようにタイトル別併記
 * - 単一タイトル店: 「あり」のみ（タイトル名は冗長なので省略）
 * - 値が一つも無ければ `undefined`（呼び出し側で「未登録」表示）
 *
 * `isUserReport` かつ値が `yes`/`no` のセグメントにのみ「（未確認）」を付ける
 * （`unknown` は不確実さを値自体が示すため付けない）。
 */
export function formatByGameTernary(
  games: readonly GameTitle[],
  byGame: Partial<Record<GameTitle, TernaryState>> | undefined,
  isUserReport: boolean,
): string | undefined {
  if (!byGame) return undefined
  const multi = games.length > 1
  const segments: string[] = []
  for (const game of games) {
    const value = byGame[game]
    if (value === undefined) continue
    const suffix = isUserReport && value !== 'unknown' ? '（未確認）' : ''
    const label = `${TERNARY_LABELS[value]}${suffix}`
    segments.push(multi ? `${getGameLabel(game)} ${label}` : label)
  }
  return segments.length > 0 ? segments.join(' ／ ') : undefined
}

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

/**
 * ISO 8601 を JST の「年月日」だけに整形する（時刻は出さない）。空・不正は null。
 * 店舗単位の「情報更新日」など、日付の粒度で十分な表示に使う。JST固定の理由は
 * {@link formatLastUpdated} と同じ（SSR/クライアントの不一致回避）。
 */
export function formatDateJst(iso: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeZone: 'Asia/Tokyo',
  }).format(date)
}
