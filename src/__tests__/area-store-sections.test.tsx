import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AreaStoreSections } from '@/components/area/AreaStoreSections'
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

describe('AreaStoreSections', () => {
  it('件数が1以上の各タイトルを <h2>（件数つき）セクションで出力する', () => {
    const html = renderToStaticMarkup(<AreaStoreSections storesByGame={storesByGame} prefecture="東京都" />)
    expect(html).toContain('<h2')
    expect(html).toContain('東京都のイニブ設置店（2店）')
    expect(html).toContain('東京都のラスサバ設置店（1店）')
    expect(html).toContain('Aゲーセン新宿')
    expect(html).toContain('Bモール秋葉原')
  })

  it('件数0のタイトルはセクションごと出さない', () => {
    const html = renderToStaticMarkup(
      <AreaStoreSections storesByGame={{ 'gundam-exvs': storesByGame['gundam-exvs'], 'jojo-ls': [] }} prefecture="東京都" />,
    )
    expect(html).toContain('東京都のイニブ設置店')
    expect(html).not.toContain('ラスサバ設置店')
  })

  it('各店舗行が店舗フォーカス URL（/?store=<id>）への内部リンクになる', () => {
    const html = renderToStaticMarkup(<AreaStoreSections storesByGame={storesByGame} prefecture="東京都" />)
    expect(html).toContain('href="/?store=tk-b"')
  })
})
