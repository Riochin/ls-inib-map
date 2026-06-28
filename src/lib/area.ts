import { stores as defaultStores } from '@/data/stores'
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
