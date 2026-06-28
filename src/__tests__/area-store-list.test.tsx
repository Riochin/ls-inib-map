import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AreaStoreList } from '@/components/area/AreaStoreList'
import type { Store } from '@/types/store'

/**
 * AreaStoreList の表示挙動を SSR レンダリング（renderToStaticMarkup）で検証する。
 * jsdom / Testing Library を導入せず、出力 HTML の文字列で挙動を担保する軽量方式
 * （既存の store-detail-panel.test.tsx を踏襲）。
 */

function makeStore(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'address' | 'games'>): Store {
  return { lat: 0, lng: 0, ...partial }
}

describe('AreaStoreList', () => {
  it('店名と住所を可視テキストで表示する', () => {
    const html = renderToStaticMarkup(
      <AreaStoreList
        game="gundam-exvs"
        stores={[makeStore({ id: 's1', name: 'テスト店新宿', address: '東京都新宿区1-1-1', games: ['gundam-exvs'] })]}
      />,
    )
    expect(html).toContain('テスト店新宿')
    expect(html).toContain('東京都新宿区1-1-1')
  })

  it('各店舗行が店舗フォーカス URL（/?store=<id>）への内部リンクになる', () => {
    const html = renderToStaticMarkup(
      <AreaStoreList
        game="gundam-exvs"
        stores={[makeStore({ id: 'abc', name: '店', address: '東京都新宿区1-1-1', games: ['gundam-exvs'] })]}
      />,
    )
    expect(html).toContain('href="/?store=abc"')
  })

  it('公表台数があるゲームは台数を表示する', () => {
    const html = renderToStaticMarkup(
      <AreaStoreList
        game="gundam-exvs"
        stores={[
          makeStore({
            id: 's1',
            name: '店',
            address: '東京都新宿区1-1-1',
            games: ['gundam-exvs'],
            machineCounts: { 'gundam-exvs': 4 },
          }),
        ]}
      />,
    )
    expect(html).toContain('4台')
  })

  it('公表台数が無いゲームは台数を表示しない（行自体は表示する）', () => {
    const html = renderToStaticMarkup(
      <AreaStoreList
        game="gundam-exvs"
        stores={[makeStore({ id: 's1', name: 'ノーカウント店', address: '東京都新宿区1-1-1', games: ['gundam-exvs'] })]}
      />,
    )
    expect(html).toContain('ノーカウント店')
    expect(html).not.toContain('台')
  })
})
