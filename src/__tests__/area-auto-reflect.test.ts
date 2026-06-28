import { describe, it, expect } from 'vitest'
import { getAreaPrefectures, getAreaForPrefecture } from '@/lib/area'
import sitemap from '@/app/sitemap'
import type { Store } from '@/types/store'

/**
 * タスク6: 既存機能への影響ゼロと自動反映の検証。
 *
 * - 自動反映（Req 6.3）: 店舗データ（オーバーライド反映を含む）が変われば、エリア集計
 *   （ハブ／県ページ／サイトマップの単一データソース）も次回ビルドで自動的に変わる。
 *   集計関数は `stores` を注入可能な純関数のため、入力配列の差し替えで「次回ビルド」を再現する。
 * - 静的データ方針（Req 7.3）: 集計は read-only。入力の店舗配列・店舗オブジェクトを
 *   一切変更しない（ランタイム書き込みなし）。
 * - 影響ゼロ（Req 7.2）: 既存の地図・フィルタ・検索・クラスタ系テストが緑のまま（本スイート全体で担保）。
 */

const SITE_URL = 'https://ls-inib-map.vercel.app'

function makeStore(over: Partial<Store> & Pick<Store, 'id' | 'name' | 'address'>): Store {
  return {
    lat: 0,
    lng: 0,
    games: ['gundam-exvs'],
    ...over,
  }
}

const base: Store[] = [
  makeStore({ id: 's1', name: 'A店', address: '東京都渋谷区道玄坂1-1', games: ['gundam-exvs'] }),
  makeStore({ id: 's2', name: 'B店', address: '東京都新宿区西新宿2-2', games: ['jojo-ls'] }),
  makeStore({ id: 's3', name: 'C店', address: '大阪府大阪市北区梅田3-3', games: ['gundam-exvs', 'jojo-ls'] }),
]

describe('エリア集計の自動反映（Req 6.3）', () => {
  it('新規店舗の追加が次回集計に反映される', () => {
    const before = getAreaPrefectures(base)
    expect(before.find((a) => a.slug === 'fukuoka')).toBeUndefined()

    const after = getAreaPrefectures([
      ...base,
      makeStore({ id: 's4', name: 'D店', address: '福岡県福岡市博多区1-1', games: ['gundam-exvs'] }),
    ])
    expect(after.find((a) => a.slug === 'fukuoka')?.total).toBe(1)
  })

  it('店舗数の変化（同一県への追加）が total / countByGame に反映される', () => {
    const before = getAreaPrefectures(base).find((a) => a.slug === 'tokyo')!
    expect(before.total).toBe(2)

    const after = getAreaPrefectures([
      ...base,
      makeStore({ id: 's5', name: 'E店', address: '東京都港区六本木4-4', games: ['gundam-exvs'] }),
    ]).find((a) => a.slug === 'tokyo')!
    expect(after.total).toBe(3)
    expect(after.countByGame['gundam-exvs']).toBe(before.countByGame['gundam-exvs'] + 1)
  })

  it('closed / delisted への変更（オーバーライド相当）が県を集計から除外する', () => {
    const closedOsaka = base.map((s) =>
      s.id === 's3' ? makeStore({ ...s, closed: true }) : s,
    )
    const after = getAreaPrefectures(closedOsaka)
    expect(after.find((a) => a.slug === 'osaka')).toBeUndefined()
  })

  it('県詳細（getAreaForPrefecture）もデータ変更を反映する', () => {
    const before = getAreaForPrefecture('tokyo', base)!
    expect(before.storesByGame['gundam-exvs']).toHaveLength(1)

    const after = getAreaForPrefecture('tokyo', [
      ...base,
      makeStore({ id: 's6', name: 'あ店', address: '東京都台東区上野5-5', games: ['gundam-exvs'] }),
    ])!
    expect(after.storesByGame['gundam-exvs']).toHaveLength(2)
    // 追加後も店名が日本語ロケール昇順を維持する
    const names = after.storesByGame['gundam-exvs'].map((s) => s.name)
    expect(names).toContain('あ店')
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ja')))
  })
})

describe('サイトマップへの自動反映（Req 4.x / 6.3）', () => {
  it('県ページ URL がエリア集計のスラッグと1対1で対応する（データ変更が流れる構造）', () => {
    const areas = getAreaPrefectures()
    const prefUrls = sitemap()
      .map((e) => e.url)
      .filter((u) => /\/area\/[^/]+$/.test(u))
    const expected = areas.map((a) => `${SITE_URL}/area/${a.slug}`).sort()
    expect(prefUrls.sort()).toEqual(expected)
  })
})

describe('静的データ方針・ランタイム書き込みなし（Req 7.3）', () => {
  it('getAreaPrefectures は入力の店舗配列を変更しない', () => {
    const input = [...base]
    const snapshot = JSON.stringify(input)
    getAreaPrefectures(input)
    expect(input).toHaveLength(base.length)
    expect(JSON.stringify(input)).toBe(snapshot)
  })

  it('getAreaForPrefecture は入力の店舗配列・店舗オブジェクトを変更しない', () => {
    const input = [...base]
    const snapshot = JSON.stringify(input)
    getAreaForPrefecture('osaka', input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})
