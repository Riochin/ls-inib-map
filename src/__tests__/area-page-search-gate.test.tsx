import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AreaPageContent } from '@/components/area/AreaPageContent'
import { AREA_SEARCH_MIN_STORES } from '@/lib/area'
import type { AreaDetail, AreaSummary } from '@/lib/area'
import type { Store } from '@/types/store'

function makeStore(id: string): Store {
  return { id, name: `店舗${id}`, address: `東京都新宿区${id}`, lat: 0, lng: 0, games: ['gundam-exvs'] }
}

function detailWithCount(total: number): AreaDetail {
  const stores = Array.from({ length: total }, (_, i) => makeStore(`s${i}`))
  return { prefecture: '東京都', slug: 'tokyo', total, storesByGame: { 'gundam-exvs': stores, 'jojo-ls': [] } }
}

const source = { jojols: 'https://example.com/jojols', gundam: 'https://example.com/gundam' }
const otherAreas: AreaSummary[] = [
  { prefecture: '大阪府', slug: 'osaka', total: 3, countByGame: { 'gundam-exvs': 3, 'jojo-ls': 0 } },
]

function render(detail: AreaDetail) {
  return renderToStaticMarkup(
    <AreaPageContent detail={detail} lastUpdated={null} source={source} otherAreas={otherAreas} />,
  )
}

describe('AreaPageContent — 検索UIの閾値ゲート', () => {
  it('店舗数が閾値以上の県は検索入力欄を出す', () => {
    const html = render(detailWithCount(AREA_SEARCH_MIN_STORES))
    expect(html).toContain('店名・住所')
    expect(html).toMatch(/<input[^>]*>/)
  })

  it('店舗数が閾値未満の県は検索入力欄を出さない（静的のまま）', () => {
    const html = render(detailWithCount(AREA_SEARCH_MIN_STORES - 1))
    expect(html).not.toMatch(/<input[^>]*>/)
    // 一覧自体は静的に出る
    expect(html).toContain('店舗s0')
  })
})
