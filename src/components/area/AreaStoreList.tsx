import type { GameTitle, Store } from '@/types/store'
import { getGameLabel } from '@/lib/marker-color'

/**
 * タイトル別セクション内の店舗一覧（presentational・状態なし）。
 *
 * 各店舗行は店名・住所・ゲーム別台数（公表値があるもののみ）を可視テキストで表示し、
 * 行全体を既存アプリの店舗フォーカス URL（`/?store=<id>`）へのクロール可能な内部リンクにする。
 * 店名など動的文字列は見出しフォント（サブセット）を当てずシステムフォントで表示する。
 */

/** 台数バッジの出力順（複数タイトル店は両方を併記）。 */
const GAME_TITLES: readonly GameTitle[] = ['gundam-exvs', 'jojo-ls']

function MachineCountBadges({ store }: { store: Store }) {
  const badges = GAME_TITLES.filter((game) => store.machineCounts?.[game] != null).map((game) => (
    <span
      key={game}
      className="rounded-full px-2 py-0.5 text-xs whitespace-nowrap"
      style={{ backgroundColor: '#F3E8FF', color: '#7B2FBE' }}
    >
      {getGameLabel(game)} {store.machineCounts?.[game]}台
    </span>
  ))
  if (badges.length === 0) return null
  return <div className="mt-1 flex flex-wrap gap-1">{badges}</div>
}

export function AreaStoreList({ game, stores }: { game: GameTitle; stores: Store[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {stores.map((store) => (
        <li key={`${game}-${store.id}`}>
          <a
            href={`/?store=${store.id}`}
            className="block rounded-xl border border-purple-100 bg-white px-4 py-3 transition-colors hover:bg-purple-50"
          >
            <div className="font-bold text-gray-900">{store.name}</div>
            <div className="mt-0.5 text-sm text-gray-600">{store.address}</div>
            <MachineCountBadges store={store} />
          </a>
        </li>
      ))}
    </ul>
  )
}
