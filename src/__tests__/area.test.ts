import { describe, it, expect } from 'vitest'
import { getAreaPrefectures, getAreaForPrefecture, getAreaLastModified } from '@/lib/area'
import type { Store } from '@/types/store'

/** テスト用の最小 Store を生成するヘルパー。 */
function makeStore(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'address' | 'games'>): Store {
  return {
    lat: 0,
    lng: 0,
    ...partial,
  }
}

const fixtures: Store[] = [
  makeStore({
    id: 'tk-b',
    name: 'Bモール秋葉原',
    address: '東京都千代田区外神田1-1-1',
    games: ['gundam-exvs'],
    machineCounts: { 'gundam-exvs': 4 },
  }),
  makeStore({
    id: 'tk-a',
    name: 'Aゲーセン新宿',
    address: '東京都新宿区新宿3-1-1',
    games: ['gundam-exvs', 'jojo-ls'], // 複数タイトル店
    machineCounts: { 'gundam-exvs': 2, 'jojo-ls': 3 },
  }),
  makeStore({
    id: 'os-1',
    name: '大阪ラスサバ館',
    address: '大阪府大阪市北区梅田1-1-1',
    games: ['jojo-ls'],
  }),
  makeStore({
    id: 'closed-1',
    name: '閉店した店',
    address: '東京都渋谷区道玄坂1-1-1',
    games: ['gundam-exvs'],
    closed: true,
  }),
  makeStore({
    id: 'delisted-1',
    name: '移設疑い店',
    address: '東京都品川区大井1-1-1',
    games: ['jojo-ls'],
    delisted: true,
  }),
  makeStore({
    id: 'noaddr-1',
    name: '住所不明店',
    address: '海外のどこか',
    games: ['gundam-exvs'],
  }),
]

describe('getAreaPrefectures', () => {
  it('店舗が1件以上ある都道府県のみを都道府県名昇順で返す', () => {
    const areas = getAreaPrefectures(fixtures)
    expect(areas.map((a) => a.prefecture)).toEqual(['大阪府', '東京都'])
  })

  it('スラッグが付与される', () => {
    const areas = getAreaPrefectures(fixtures)
    const osaka = areas.find((a) => a.prefecture === '大阪府')
    expect(osaka?.slug).toBe('osaka')
  })

  it('total は営業中のユニーク店舗数（複数タイトル店は1件）', () => {
    const tokyo = getAreaPrefectures(fixtures).find((a) => a.prefecture === '東京都')
    expect(tokyo?.total).toBe(2)
  })

  it('countByGame はタイトル別件数（複数タイトル店は両方に計上）', () => {
    const tokyo = getAreaPrefectures(fixtures).find((a) => a.prefecture === '東京都')
    expect(tokyo?.countByGame['gundam-exvs']).toBe(2)
    expect(tokyo?.countByGame['jojo-ls']).toBe(1)
  })

  it('closed / delisted / 住所不明の店舗を除外する', () => {
    const areas = getAreaPrefectures(fixtures)
    const total = areas.reduce((sum, a) => sum + a.total, 0)
    // 東京2 + 大阪1 = 3（閉店・移設・住所不明は除外）
    expect(total).toBe(3)
  })
})

describe('getAreaForPrefecture', () => {
  it('指定スラッグの県詳細をタイトル別に返す', () => {
    const detail = getAreaForPrefecture('tokyo', fixtures)
    expect(detail).not.toBeNull()
    expect(detail?.prefecture).toBe('東京都')
    expect(detail?.slug).toBe('tokyo')
    expect(detail?.total).toBe(2)
  })

  it('複数タイトル店が両セクションに計上される', () => {
    const detail = getAreaForPrefecture('tokyo', fixtures)
    const gundamIds = detail?.storesByGame['gundam-exvs'].map((s) => s.id)
    const jojoIds = detail?.storesByGame['jojo-ls'].map((s) => s.id)
    expect(gundamIds).toContain('tk-a')
    expect(jojoIds).toContain('tk-a')
  })

  it('タイトル別件数と一覧の実件数が一致する', () => {
    const summary = getAreaPrefectures(fixtures).find((a) => a.prefecture === '東京都')
    const detail = getAreaForPrefecture('tokyo', fixtures)
    expect(detail?.storesByGame['gundam-exvs'].length).toBe(summary?.countByGame['gundam-exvs'])
    expect(detail?.storesByGame['jojo-ls'].length).toBe(summary?.countByGame['jojo-ls'])
  })

  it('店名を日本語ロケールで昇順ソートする', () => {
    const detail = getAreaForPrefecture('tokyo', fixtures)
    const names = detail?.storesByGame['gundam-exvs'].map((s) => s.name)
    expect(names).toEqual(['Aゲーセン新宿', 'Bモール秋葉原'])
  })

  it('closed / delisted を一覧から除外する', () => {
    const detail = getAreaForPrefecture('tokyo', fixtures)
    const allIds = [
      ...(detail?.storesByGame['gundam-exvs'] ?? []),
      ...(detail?.storesByGame['jojo-ls'] ?? []),
    ].map((s) => s.id)
    expect(allIds).not.toContain('closed-1')
    expect(allIds).not.toContain('delisted-1')
  })

  it('店舗0または未知スラッグは null', () => {
    expect(getAreaForPrefecture('hokkaido', fixtures)).toBeNull() // 店舗0
    expect(getAreaForPrefecture('atlantis', fixtures)).toBeNull() // 未知
  })
})

describe('getAreaLastModified', () => {
  const prefMap = {
    東京都: '2026-07-01T00:00:00.000Z',
    大阪府: '2026-08-01T00:00:00.000Z',
  }

  it('都道府県別更新日時（prefectureUpdatedAt）を返す', () => {
    expect(getAreaLastModified('osaka', fixtures, prefMap)?.toISOString()).toBe(
      '2026-08-01T00:00:00.000Z',
    )
  })

  it('その県の店舗の infoUpdatedAt の方が新しければそちらを返す', () => {
    const withInfo = fixtures.map((s) =>
      s.id === 'tk-a' ? { ...s, infoUpdatedAt: '2026-09-01' } : s,
    )
    expect(getAreaLastModified('tokyo', withInfo, prefMap)?.toISOString()).toBe(
      new Date('2026-09-01').toISOString(),
    )
  })

  it('infoUpdatedAt が prefectureUpdatedAt より古ければ prefectureUpdatedAt を返す', () => {
    const withInfo = fixtures.map((s) =>
      s.id === 'tk-a' ? { ...s, infoUpdatedAt: '2026-06-01' } : s,
    )
    expect(getAreaLastModified('tokyo', withInfo, prefMap)?.toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    )
  })

  it('県別更新日時も infoUpdatedAt も無い県は null（lastmod を出さない）', () => {
    expect(getAreaLastModified('tokyo', fixtures, {})).toBeNull()
    expect(getAreaLastModified('tokyo', fixtures, { 大阪府: '2026-08-01T00:00:00.000Z' })).toBeNull()
  })

  it('閉店・移設店の infoUpdatedAt は考慮しない（一覧に出ないため）', () => {
    const withInfo = fixtures.map((s) =>
      s.id === 'closed-1' ? { ...s, infoUpdatedAt: '2026-09-01' } : s,
    )
    expect(getAreaLastModified('tokyo', withInfo, prefMap)?.toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    )
  })

  it('未知スラッグは null', () => {
    expect(getAreaLastModified('atlantis', fixtures, prefMap)).toBeNull()
  })
})
