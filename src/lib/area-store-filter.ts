import type { FacilityFilter, GameTitle, Store } from '@/types/store'
import { filterStoresByKeyword } from '@/lib/filter'
import { filterStoresByFacility } from '@/lib/facility-filter'

/**
 * 県ページ内の検索・絞り込み条件。
 *
 * マップUIの検索（ナビゲーション）とは別意図（一覧のその場スキャン）だが、
 * 一致規則は地図と一致させるため既存の純関数を共有する。
 */
export interface AreaStoreQuery {
  /** 店名・住所のフリーテキスト（空白区切り AND）。 */
  query: string
  /** 設備ファセット。`openOnly` は県ページでは常に全件一致のため使用しない。 */
  facility: FacilityFilter
}

/**
 * タイトル別の店舗一覧に検索・絞り込みを適用する（純関数）。
 *
 * 各タイトルセクションを当該タイトル（`game`）でスコープして適用する。
 * フリーテキストは {@link filterStoresByKeyword}（店名＋住所）、設備は
 * {@link filterStoresByFacility} を再利用し、エリア側で一致ロジックを再実装しない。
 * 台数・配信台・録画台は当該タイトルでスコープされ、フリーテキストと設備は AND 結合する。
 */
export function filterAreaStoresByGame(
  storesByGame: Record<GameTitle, Store[]>,
  { query, facility }: AreaStoreQuery,
): Record<GameTitle, Store[]> {
  const result = {} as Record<GameTitle, Store[]>
  for (const game of Object.keys(storesByGame) as GameTitle[]) {
    const byKeyword = filterStoresByKeyword(storesByGame[game], query)
    result[game] = filterStoresByFacility(byKeyword, facility, game)
  }
  return result
}
