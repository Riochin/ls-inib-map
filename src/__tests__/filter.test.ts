import { describe, it, expect } from 'vitest'
import { filterStores } from '@/lib/filter'
import type { Store } from '@/types/store'

const testStores: Store[] = [
  { id: '1', name: 'ラスサバ店', address: '東京都', lat: 35.0, lng: 139.0, games: ['jojo-ls'] },
  { id: '2', name: 'イニブ店', address: '東京都', lat: 35.1, lng: 139.1, games: ['gundam-exvs'] },
  { id: '3', name: '両方店', address: '東京都', lat: 35.2, lng: 139.2, games: ['jojo-ls', 'gundam-exvs'] },
]

describe('filterStores', () => {
  it('allフィルタで全店舗を返す', () => {
    const result = filterStores(testStores, 'all')
    expect(result).toHaveLength(3)
  })

  it('jojo-lsフィルタでラスサバ店舗のみ返す', () => {
    const result = filterStores(testStores, 'jojo-ls')
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id)).toContain('1')
    expect(result.map((s) => s.id)).toContain('3')
  })

  it('gundam-exvsフィルタでイニブ店舗のみ返す', () => {
    const result = filterStores(testStores, 'gundam-exvs')
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id)).toContain('2')
    expect(result.map((s) => s.id)).toContain('3')
  })

  it('両タイトル店舗はどちらのフィルタでも表示される', () => {
    const jojoResult = filterStores(testStores, 'jojo-ls')
    const gundamResult = filterStores(testStores, 'gundam-exvs')
    expect(jojoResult.find((s) => s.id === '3')).toBeDefined()
    expect(gundamResult.find((s) => s.id === '3')).toBeDefined()
  })
})
