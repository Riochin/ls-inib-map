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
 * `unconfirmed`（出どころが admin 以外）かつ値が `yes`/`no` のセグメントにのみ「（未確認）」を
 * 付ける（`unknown` は不確実さを値自体が示すため付けない）。
 */
export function formatByGameTernary({
  games,
  byGame,
  unconfirmed,
}: {
  games: readonly GameTitle[]
  byGame: Partial<Record<GameTitle, TernaryState>> | undefined
  /** 出どころが admin 以外（未確認）か。yes/no のセグメントに「（未確認）」を付けるかの判定 */
  unconfirmed: boolean
}): string | undefined {
  if (!byGame) return undefined
  const multi = games.length > 1
  const segments: string[] = []
  for (const game of games) {
    const value = byGame[game]
    if (value === undefined) continue
    const suffix = unconfirmed && value !== 'unknown' ? '（未確認）' : ''
    const label = `${TERNARY_LABELS[value]}${suffix}`
    segments.push(multi ? `${getGameLabel(game)} ${label}` : label)
  }
  return segments.length > 0 ? segments.join(' ／ ') : undefined
}

/**
 * ゲーム別フロアを店舗詳細パネル用の文字列に整形する。`formatByGameTernary` と同じ整形思想。
 * - 全タイトルが同じフロア（または単一タイトル店）: 「2F」と1つに集約（共通フロア）
 * - フロアが分かれる: 「ラスサバ 2F ／ イニブ 3F」のようにタイトル別併記
 * - 値が一つも無ければ `value: undefined`（呼び出し側で「未登録」表示）
 *
 * 各ゲームは `floorByGame[game]`（明示値）を優先し、無ければ店舗単位 `storeWideFloor` へ
 * フォールバックする（既存の店舗共通フロアもこの経路で表示される）。
 *
 * 確定/未確認はフロア属性の出どころ（`unconfirmed` 引数）だけで決める（モデル統一）。
 * `unconfirmed`（出どころが admin 以外）のとき値に「（未確認）」を付ける。共通フロアでも
 * 出どころが admin なら確定として無印で「2F」と出す。`soft` は未確認かどうかで、呼び出し側で
 * 文字色（amber）の出し分けに使う。
 */
export function formatFloorByGame({
  games,
  floorByGame,
  storeWideFloor,
  unconfirmed,
}: {
  games: readonly GameTitle[]
  floorByGame: Partial<Record<GameTitle, string>> | undefined
  /** 店舗単位の共通フロア（floorByGame に無いゲームのフォールバック先） */
  storeWideFloor: string | undefined
  /** 出どころが admin 以外（未確認）か。「（未確認）」を付けるかの判定 */
  unconfirmed: boolean
}): { value: string | undefined; soft: boolean } {
  const multi = games.length > 1
  const resolved: { game: GameTitle; value: string }[] = []
  for (const game of games) {
    const value = floorByGame?.[game] ?? storeWideFloor
    if (value === undefined || value === '') continue
    resolved.push({ game, value })
  }
  if (resolved.length === 0) return { value: undefined, soft: false }

  const suffix = unconfirmed ? '（未確認）' : ''

  // 単一タイトル店、または全タイトルが同じフロア（＝共通フロア）なら1つに集約して見せる
  const allSame = resolved.length === games.length && resolved.every((r) => r.value === resolved[0].value)
  if (!multi || allSame) {
    return { value: `${resolved[0].value}${suffix}`, soft: unconfirmed }
  }

  const segments = resolved.map((r) => `${getGameLabel(r.game)} ${r.value}${suffix}`)
  return { value: segments.join(' ／ '), soft: unconfirmed }
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
