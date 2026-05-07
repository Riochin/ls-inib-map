import { describe, it, expect } from 'vitest'
import { filterStoresByKeyword } from '@/lib/filter'
import type { Store } from '@/types/store'

const testStores: Store[] = [
  { id: '1', name: 'ラウンドワン府中本町駅前', address: '東京都府中市本町1-13-3', lat: 35.0, lng: 139.0, games: ['jojo-ls'] },
  { id: '2', name: 'ラウンドワン吉祥寺', address: '東京都武蔵野市吉祥寺本町1-11-22', lat: 35.1, lng: 139.1, games: ['gundam-exvs'] },
  { id: '3', name: 'namco巣鴨店', address: '東京都豊島区巣鴨1-16-7', lat: 35.2, lng: 139.2, games: ['jojo-ls', 'gundam-exvs'] },
  { id: '4', name: 'GiGO秋葉原', address: '東京都千代田区外神田1-14-2', lat: 35.3, lng: 139.3, games: ['jojo-ls'] },
]

describe('filterStoresByKeyword', () => {
  it('空クエリで全店舗を返す', () => {
    expect(filterStoresByKeyword(testStores, '')).toHaveLength(4)
  })

  it('スペースのみのクエリで全店舗を返す', () => {
    expect(filterStoresByKeyword(testStores, '   ')).toHaveLength(4)
  })

  it('店舗名で部分一致検索できる', () => {
    const result = filterStoresByKeyword(testStores, 'ラウンド')
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id)).toContain('1')
    expect(result.map((s) => s.id)).toContain('2')
  })

  it('住所で部分一致検索できる', () => {
    const result = filterStoresByKeyword(testStores, '外神田')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('4')
  })

  it('大文字小文字を区別しない', () => {
    const result = filterStoresByKeyword(testStores, 'NAMCO')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('複数トークンのAND検索', () => {
    const result = filterStoresByKeyword(testStores, 'ラウンド 府中')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('どの店舗にもマッチしないクエリで空配列を返す', () => {
    expect(filterStoresByKeyword(testStores, '存在しない店舗名xyz')).toHaveLength(0)
  })

  it('店舗名と住所をまたいだクロスフィールド検索はしない（各フィールド内の検索）', () => {
    // 店舗名に「府中」を含む or 住所に「府中」を含むものがヒット
    const result = filterStoresByKeyword(testStores, '府中')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})
