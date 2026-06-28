import type { GameTitle, Store } from '@/types/store'
import { getGameLabel } from '@/lib/marker-color'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { AreaStoreList } from '@/components/area/AreaStoreList'

/**
 * タイトル別 `<section>(h2 + AreaStoreList)` の描画（presentational・状態なし）。
 *
 * 県ページの静的描画（{@link AreaPageContent}）と、検索・絞り込みアイランド
 * （{@link AreaStoreFilter}）の双方から再利用し、セクション描画の二重実装を防ぐ。
 * 件数0のタイトルはセクションごと出力しない。
 */

const BRAND_PURPLE = '#7B2FBE'
/** タイトル別セクションの出力順 */
const GAME_TITLES: readonly GameTitle[] = ['gundam-exvs', 'jojo-ls']

export function AreaStoreSections({
  storesByGame,
  prefecture,
}: {
  storesByGame: Record<GameTitle, Store[]>
  prefecture: string
}) {
  return (
    <>
      {GAME_TITLES.map((game) => {
        const list = storesByGame[game]
        if (list.length === 0) return null
        return (
          <section key={game}>
            <h2 className="mb-3 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
              {prefecture}の{getGameLabel(game)}設置店（{list.length}店）
            </h2>
            <AreaStoreList game={game} stores={list} />
          </section>
        )
      })}
    </>
  )
}
