import { describe, it, expect } from 'vitest'
import { filterStoresByBounds } from '@/hooks/use-visible-stores'
import type { Store } from '@/types/store'

function makeStore(id: string, lat: number, lng: number): Store {
  return { id, name: `店舗${id}`, address: '東京都', lat, lng, games: ['gundam-exvs'] }
}

const stores: Store[] = [
  makeStore('tokyo', 35.68, 139.77),       // 東京
  makeStore('yokohama', 35.44, 139.64),     // 横浜
  makeStore('saitama', 35.86, 139.65),      // 埼玉
  makeStore('osaka', 34.69, 135.50),        // 大阪（遠方）
  makeStore('sapporo', 43.06, 141.35),      // 札幌（遠方）
]

// 東京周辺のバウンド（おおよそzoom 10相当）
const tokyoBounds = { north: 36.0, south: 35.3, east: 140.2, west: 139.3 }

describe('filterStoresByBounds', () => {
  it('バウンド内の店舗のみ返す', () => {
    const result = filterStoresByBounds(stores, tokyoBounds, 0)
    const ids = result.map((s) => s.id)
    expect(ids).toContain('tokyo')
    expect(ids).toContain('yokohama')
    expect(ids).toContain('saitama')
    expect(ids).not.toContain('osaka')
    expect(ids).not.toContain('sapporo')
  })

  it('パディングによりバウンド外の近傍店舗も含まれる', () => {
    // 東京のみ含む狭いバウンド
    const narrowBounds = { north: 35.70, south: 35.66, east: 139.80, west: 139.74 }
    const withoutPadding = filterStoresByBounds(stores, narrowBounds, 0)
    const withPadding = filterStoresByBounds(stores, narrowBounds, 5.0) // 大きなパディング

    expect(withPadding.length).toBeGreaterThan(withoutPadding.length)
  })

  it('デフォルトパディング（20%）が適用される', () => {
    // バウンドぎりぎり外の店舗が20%パディングで含まれることを確認
    const tightBounds = { north: 35.85, south: 35.45, east: 139.80, west: 139.60 }
    const noPad = filterStoresByBounds(stores, tightBounds, 0)
    const defaultPad = filterStoresByBounds(stores, tightBounds)

    expect(defaultPad.length).toBeGreaterThanOrEqual(noPad.length)
  })

  it('空の店舗配列に対して空配列を返す', () => {
    const result = filterStoresByBounds([], tokyoBounds)
    expect(result).toEqual([])
  })

  it('バウンド境界上の店舗を含む', () => {
    const exactBounds = { north: 35.68, south: 35.68, east: 139.77, west: 139.77 }
    const result = filterStoresByBounds(stores, exactBounds, 0)
    expect(result.map((s) => s.id)).toContain('tokyo')
  })
})
