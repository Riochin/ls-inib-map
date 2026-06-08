import { stores } from '@/data/stores'
import { parseAddress } from '@/lib/address-parser'
import type { GameTitle } from '@/types/store'

/**
 * 検索エンジン／スクリーンリーダー向けの本文テキスト。
 *
 * トップページ（`page.tsx`）はほぼ全面が地図の Client Component で、初期 HTML に
 * クロール可能なテキストが title/description しか含まれない。本コンポーネントは
 * Server Component として都道府県別の店舗一覧を SSR で出力し、「ラスサバ 設置店舗 ○○県」
 * のような地名込みの検索クエリへの被リンク面を作る。視覚的には `sr-only` で隠し、
 * 地図 UI の見た目には影響させない（スクリーンリーダーには読み上げられる）。
 */

const GAME_LABELS: Record<GameTitle, string> = {
  'jojo-ls': 'ジョジョの奇妙な冒険 ラストサバイバー（ラスサバ）',
  'gundam-exvs': '機動戦士ガンダム EXTREME VS.2 INFINITEBOOST（イニブ）',
}

interface PrefectureGroup {
  prefecture: string
  names: string[]
}

/** 都道府県別に店舗名を集計（営業中のみ。閉店/移設は除外）。 */
function groupByPrefecture(): PrefectureGroup[] {
  const map = new Map<string, string[]>()
  for (const store of stores) {
    if (store.closed || store.delisted) continue
    const { prefecture } = parseAddress(store.address)
    if (!prefecture) continue
    const list = map.get(prefecture) ?? []
    list.push(store.name)
    map.set(prefecture, list)
  }
  return [...map.entries()]
    .map(([prefecture, names]) => ({
      prefecture,
      names: names.sort((a, b) => a.localeCompare(b, 'ja')),
    }))
    .sort((a, b) => a.prefecture.localeCompare(b.prefecture, 'ja'))
}

export function SeoContent() {
  const groups = groupByPrefecture()
  const total = groups.reduce((sum, g) => sum + g.names.length, 0)

  return (
    <section className="sr-only" aria-label="設置店舗一覧">
      <h1>ラスサバ・イニブ 設置店舗マップ｜全国のゲームセンターを地図で検索</h1>
      <p>
        {GAME_LABELS['jojo-ls']}と{GAME_LABELS['gundam-exvs']}
        の設置店舗を地図で検索できる非公式アプリです。全国47都道府県・約{total}
        店舗を公式サイトの設置店舗一覧から自動更新しています。タイトル別フィルタ・店舗名検索・
        都道府県／市区町村での絞り込み・現在地からの検索に対応。
      </p>
      <h2>都道府県別の設置店舗一覧</h2>
      {groups.map((group) => (
        <section key={group.prefecture}>
          <h3>
            {group.prefecture}の設置店舗（{group.names.length}店舗）
          </h3>
          <ul>
            {group.names.map((name, i) => (
              <li key={`${group.prefecture}-${i}`}>{name}</li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}
