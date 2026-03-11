import { describe, it, expect } from 'vitest'
import { stores } from '@/data/stores'
import type { Store } from '@/types/store'

describe('店舗データ', () => {
  it('店舗データが空でない', () => {
    expect(stores.length).toBeGreaterThan(0)
  })

  it('全店舗が必須フィールドを持つ', () => {
    for (const store of stores) {
      expect(store.id).toBeTruthy()
      expect(store.name).toBeTruthy()
      expect(store.address).toBeTruthy()
      expect(store.lat).toBeTypeOf('number')
      expect(store.lng).toBeTypeOf('number')
      expect(store.games.length).toBeGreaterThan(0)
    }
  })

  it('店舗IDが全て一意である', () => {
    const ids = stores.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('緯度経度が日本国内の有効な範囲内である', () => {
    for (const store of stores) {
      expect(store.lat).toBeGreaterThanOrEqual(24)
      expect(store.lat).toBeLessThanOrEqual(46)
      expect(store.lng).toBeGreaterThanOrEqual(122)
      expect(store.lng).toBeLessThanOrEqual(154)
    }
  })

  it('ラスサバの設置店舗が含まれている', () => {
    const jojoStores = stores.filter((s) => s.games.includes('jojo-ls'))
    expect(jojoStores.length).toBeGreaterThan(0)
  })

  it('イニブの設置店舗が含まれている', () => {
    const gundamStores = stores.filter((s) => s.games.includes('gundam-exvs'))
    expect(gundamStores.length).toBeGreaterThan(0)
  })

  it('ゲームタイトルは有効な値のみ含む', () => {
    const validTitles = ['jojo-ls', 'gundam-exvs']
    for (const store of stores) {
      for (const game of store.games) {
        expect(validTitles).toContain(game)
      }
    }
  })
})
