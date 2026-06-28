import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AreaStoreFilter } from '@/components/area/AreaStoreFilter'
import type { GameTitle, Store } from '@/types/store'

function makeStore(
  partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'address' | 'games'>,
): Store {
  return { lat: 0, lng: 0, ...partial }
}

const storesByGame: Record<GameTitle, Store[]> = {
  'gundam-exvs': [
    makeStore({ id: 'tk-a', name: 'Aゲーセン新宿', address: '東京都新宿区新宿3-1-1', games: ['gundam-exvs'] }),
    makeStore({ id: 'tk-b', name: 'Bモール秋葉原', address: '東京都千代田区外神田1-1-1', games: ['gundam-exvs'] }),
  ],
  'jojo-ls': [
    makeStore({ id: 'tk-a', name: 'Aゲーセン新宿', address: '東京都新宿区新宿3-1-1', games: ['jojo-ls'] }),
  ],
}

function render() {
  return renderToStaticMarkup(<AreaStoreFilter storesByGame={storesByGame} prefecture="東京都" />)
}

describe('AreaStoreFilter — 初期描画（段階的強化の担保）', () => {
  it('初期状態（検索語なし・ファセットなし）で県内全店を描画する', () => {
    const html = render()
    expect(html).toContain('Aゲーセン新宿')
    expect(html).toContain('Bモール秋葉原')
  })

  it('店名・住所のフリーテキスト入力欄を出力する', () => {
    const html = render()
    const input = html.match(/<input[^>]*>/)
    expect(input).not.toBeNull()
    expect(html).toContain('店名・住所')
  })

  it('設備ファセット（最低台数・配信台・録画台・喫煙所）を出力する', () => {
    const html = render()
    expect(html).toContain('最低台数')
    expect(html).toContain('配信台')
    expect(html).toContain('録画台')
    expect(html).toContain('喫煙所')
  })

  it('「営業中のみ」ファセットは出さない（県ページは既に営業中のみ）', () => {
    expect(render()).not.toContain('営業中')
  })
})
