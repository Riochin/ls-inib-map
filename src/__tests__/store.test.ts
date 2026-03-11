import { describe, it, expect } from 'vitest'
import type { GameTitle, Store, FilterOption } from '@/types/store'

describe('Store型定義', () => {
  it('GameTitleはjojo-lsとgundam-exvsを受け入れる', () => {
    const jojoTitle: GameTitle = 'jojo-ls'
    const gundamTitle: GameTitle = 'gundam-exvs'
    expect(jojoTitle).toBe('jojo-ls')
    expect(gundamTitle).toBe('gundam-exvs')
  })

  it('Storeは必須フィールドを全て持つ', () => {
    const store: Store = {
      id: 'test-001',
      name: 'テスト店舗',
      address: '東京都新宿区1-1-1',
      lat: 35.6895,
      lng: 139.6917,
      games: ['jojo-ls'],
    }
    expect(store.id).toBe('test-001')
    expect(store.name).toBe('テスト店舗')
    expect(store.address).toBe('東京都新宿区1-1-1')
    expect(store.lat).toBe(35.6895)
    expect(store.lng).toBe(139.6917)
    expect(store.games).toEqual(['jojo-ls'])
  })

  it('Storeは複数タイトルを持てる', () => {
    const store: Store = {
      id: 'test-002',
      name: '両タイトル店舗',
      address: '東京都渋谷区2-2-2',
      lat: 35.6580,
      lng: 139.7016,
      games: ['jojo-ls', 'gundam-exvs'],
    }
    expect(store.games).toHaveLength(2)
    expect(store.games).toContain('jojo-ls')
    expect(store.games).toContain('gundam-exvs')
  })

  it('FilterOptionはall, jojo-ls, gundam-exvsを受け入れる', () => {
    const all: FilterOption = 'all'
    const jojo: FilterOption = 'jojo-ls'
    const gundam: FilterOption = 'gundam-exvs'
    expect(all).toBe('all')
    expect(jojo).toBe('jojo-ls')
    expect(gundam).toBe('gundam-exvs')
  })
})
