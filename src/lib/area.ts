import { stores as defaultStores, storesMeta as defaultMeta } from '@/data/stores'
import { parseAddress } from '@/lib/address-parser'
import { prefectureToSlug } from '@/lib/prefecture-slug'
import type { GameTitle, Store } from '@/types/store'

/**
 * エリア（都道府県）単位の集計ロジック。
 *
 * 既存の `stores`（オーバーライド適用済み）のみを入力とし、住所パースは
 * 既存 {@link parseAddress} を再利用する。新規の手作業データは発生せず、ビルド時に
 * 純関数で集計される（SSG／サイトマップ／静的パラメータの唯一のデータソース）。
 *
 * 集計ルール（既存 `SeoContent.groupByPrefecture` を踏襲）:
 * - `closed` または `delisted` の店舗は除外
 * - `parseAddress(store.address).prefecture` が空の店舗は除外
 * - 各店は `games` に含まれるタイトルのセクションに計上（複数タイトル店は両方に登場）
 * - 店名は `localeCompare(…, 'ja')` で昇順ソート
 */

/** エリア集計対象のゲームタイトル（出力順固定） */
const GAME_TITLES: readonly GameTitle[] = ['gundam-exvs', 'jojo-ls']

/**
 * 県ページに店内検索・絞り込みUIを出す店舗数の閾値（この値以上で表示）。
 *
 * 少件数の県では検索が過剰でノンテック層にノイズになるため、店舗が多い県だけに出す。
 * 単一定数で調整可能。未満の県は従来どおりクライアントJS非依存の静的描画を維持する。
 */
export const AREA_SEARCH_MIN_STORES = 10

export interface AreaSummary {
  /** 正式名（例「東京都」） */
  prefecture: string
  /** ローマ字スラッグ（例「tokyo」） */
  slug: string
  /** 営業中のユニーク店舗数（複数タイトル店は1件） */
  total: number
  /** タイトル別の店舗数 */
  countByGame: Record<GameTitle, number>
}

export interface AreaDetail {
  prefecture: string
  slug: string
  total: number
  /** タイトル別の店舗一覧（営業中のみ・店名昇順） */
  storesByGame: Record<GameTitle, Store[]>
}

/** 空のタイトル別件数レコードを生成する。 */
function emptyCountByGame(): Record<GameTitle, number> {
  return { 'gundam-exvs': 0, 'jojo-ls': 0 }
}

/** 集計対象（営業中・都道府県判定可）の店舗のみを通す。 */
function isEligible(store: Store): boolean {
  if (store.closed || store.delisted) return false
  return parseAddress(store.address).prefecture !== ''
}

/** 店名を日本語ロケールで昇順ソートした新配列を返す。 */
function sortByName(list: Store[]): Store[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

/**
 * 店舗が1件以上ある都道府県のサマリ（都道府県名昇順）。
 * ハブ／サイトマップ／静的パラメータ用。
 */
export function getAreaPrefectures(allStores: Store[] = defaultStores): AreaSummary[] {
  const byPref = new Map<string, Store[]>()
  for (const store of allStores) {
    if (!isEligible(store)) continue
    const { prefecture } = parseAddress(store.address)
    const list = byPref.get(prefecture) ?? []
    list.push(store)
    byPref.set(prefecture, list)
  }

  return [...byPref.entries()]
    .map(([prefecture, list]) => {
      const countByGame = emptyCountByGame()
      for (const store of list) {
        for (const game of GAME_TITLES) {
          if (store.games.includes(game)) countByGame[game] += 1
        }
      }
      return {
        prefecture,
        slug: prefectureToSlug(prefecture) ?? '',
        total: list.length,
        countByGame,
      }
    })
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, 'ja'))
}

/**
 * 指定スラッグの県詳細（タイトル別の営業中店舗一覧）。
 * 該当無し（店舗0 または未知スラッグ）は null。
 */
export function getAreaForPrefecture(
  slug: string,
  allStores: Store[] = defaultStores,
): AreaDetail | null {
  const summary = getAreaPrefectures(allStores).find((a) => a.slug === slug)
  if (!summary) return null

  const inPref = allStores.filter(
    (store) => isEligible(store) && parseAddress(store.address).prefecture === summary.prefecture,
  )

  const storesByGame: Record<GameTitle, Store[]> = {
    'gundam-exvs': sortByName(inPref.filter((s) => s.games.includes('gundam-exvs'))),
    'jojo-ls': sortByName(inPref.filter((s) => s.games.includes('jojo-ls'))),
  }

  return {
    prefecture: summary.prefecture,
    slug: summary.slug,
    total: summary.total,
    storesByGame,
  }
}

/**
 * 県ページ（`/area/[slug]`）の最終更新日時（サイトマップ `lastmod` 用）。
 *
 * 次の2つの新しい方を返す（どちらも無ければ null＝lastmod を出さない）:
 * - 生成器が記録した都道府県別の店舗集合の更新日時（{@link StoresMeta.prefectureUpdatedAt}）
 * - その県の店舗の運営による情報更新日（オーバーライド由来の `Store.infoUpdatedAt`）
 *
 * 全県一律の `storesMeta.lastUpdated` へはフォールバックしない。他県だけが変わった週にも
 * 全県ページが更新扱いになり、検索エンジンが lastmod を信用しなくなるのを避けるため。
 */
export function getAreaLastModified(
  slug: string,
  allStores: Store[] = defaultStores,
  prefectureUpdatedAt: Record<string, string> | undefined = defaultMeta.prefectureUpdatedAt,
): Date | null {
  const detail = getAreaForPrefecture(slug, allStores)
  if (!detail) return null

  const candidates: number[] = []
  const fromMeta = prefectureUpdatedAt?.[detail.prefecture]
  if (fromMeta) candidates.push(new Date(fromMeta).getTime())
  for (const game of GAME_TITLES) {
    for (const store of detail.storesByGame[game]) {
      if (store.infoUpdatedAt) candidates.push(new Date(store.infoUpdatedAt).getTime())
    }
  }
  const valid = candidates.filter((t) => Number.isFinite(t))
  if (valid.length === 0) return null
  return new Date(Math.max(...valid))
}
