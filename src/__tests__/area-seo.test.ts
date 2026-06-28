import { describe, it, expect } from 'vitest'
import {
  areaTitle,
  areaDescription,
  areaCanonicalPath,
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  AREA_SITE_URL,
} from '@/lib/area-seo'
import type { AreaDetail } from '@/lib/area'
import type { Store } from '@/types/store'

function makeStore(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'address' | 'games'>): Store {
  return { lat: 0, lng: 0, ...partial }
}

const tokyoDetail: AreaDetail = {
  prefecture: '東京都',
  slug: 'tokyo',
  total: 2,
  storesByGame: {
    'gundam-exvs': [
      makeStore({ id: 'tk-a', name: 'Aゲーセン新宿', address: '東京都新宿区新宿3-1-1', games: ['gundam-exvs', 'jojo-ls'] }),
      makeStore({ id: 'tk-b', name: 'Bモール秋葉原', address: '東京都千代田区外神田1-1-1', games: ['gundam-exvs'] }),
    ],
    'jojo-ls': [
      makeStore({ id: 'tk-a', name: 'Aゲーセン新宿', address: '東京都新宿区新宿3-1-1', games: ['gundam-exvs', 'jojo-ls'] }),
    ],
  },
}

describe('areaTitle', () => {
  it('「○○県のラスサバ・イニブ 設置店舗一覧」を返す', () => {
    expect(areaTitle('東京都')).toBe('東京都のラスサバ・イニブ 設置店舗一覧')
  })
})

describe('areaDescription', () => {
  it('県名と営業中店舗数を含む', () => {
    const desc = areaDescription(tokyoDetail)
    expect(desc).toContain('東京都')
    expect(desc).toContain('2店')
  })
})

describe('areaCanonicalPath', () => {
  it('/area/<slug> を返す', () => {
    expect(areaCanonicalPath('tokyo')).toBe('/area/tokyo')
  })
})

describe('buildBreadcrumbJsonLd', () => {
  it('ホーム → 設置店舗 → ○○県 の BreadcrumbList を返す', () => {
    const ld = buildBreadcrumbJsonLd(tokyoDetail)
    expect(ld['@type']).toBe('BreadcrumbList')
    const names = ld.itemListElement.map((e) => e.name)
    expect(names).toEqual(['ホーム', '設置店舗', '東京都'])
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2, 3])
    expect(ld.itemListElement[0].item).toBe(`${AREA_SITE_URL}/`)
    expect(ld.itemListElement[1].item).toBe(`${AREA_SITE_URL}/area`)
    expect(ld.itemListElement[2].item).toBe(`${AREA_SITE_URL}/area/tokyo`)
  })
})

describe('buildItemListJsonLd', () => {
  it('店舗一覧を ItemList で表す（重複店舗は1件に統合）', () => {
    const ld = buildItemListJsonLd(tokyoDetail)
    expect(ld['@type']).toBe('ItemList')
    // tk-a は両タイトルに登場するが ItemList では1件
    expect(ld.numberOfItems).toBe(2)
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2])
  })

  it('各店舗は店舗フォーカス URL（/?store=<id>）を持つ', () => {
    const ld = buildItemListJsonLd(tokyoDetail)
    const urls = ld.itemListElement.map((e) => e.url)
    expect(urls).toContain(`${AREA_SITE_URL}/?store=tk-a`)
    expect(urls).toContain(`${AREA_SITE_URL}/?store=tk-b`)
  })

  it('個別店舗を LocalBusiness としてマークアップしない', () => {
    const ld = buildItemListJsonLd(tokyoDetail)
    expect(JSON.stringify(ld)).not.toContain('LocalBusiness')
  })
})
