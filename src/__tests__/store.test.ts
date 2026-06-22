import { describe, it, expect } from 'vitest'
import type { GameTitle, Store, FilterOption, TernaryState, StoreAttributeKey } from '@/types/store'

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

describe('TernaryState型', () => {
  it('yes / no / unknown を受け入れる', () => {
    const yes: TernaryState = 'yes'
    const no: TernaryState = 'no'
    const unknown: TernaryState = 'unknown'
    expect(yes).toBe('yes')
    expect(no).toBe('no')
    expect(unknown).toBe('unknown')
  })
})

describe('StoreAttributeKey型', () => {
  it('全6キーを受け入れる', () => {
    const keys: StoreAttributeKey[] = [
      'businessHours',
      'floor',
      'smoking',
      'payments',
      'hasRecordingByGame',
      'hasStreamingByGame',
    ]
    expect(keys).toHaveLength(6)
  })
})

describe('Store型拡張フィールド', () => {
  it('新属性フィールドをすべて含む Store を構築できる', () => {
    const store: Store = {
      id: 'test-003',
      name: '属性フル店舗',
      address: '東京都千代田区1-1-1',
      lat: 35.68,
      lng: 139.77,
      games: ['jojo-ls'],
      businessHours: '10:00-23:00',
      floor: '2F',
      smoking: 'no',
      payments: ['Suica', 'PayPay'],
      hasRecordingByGame: { 'jojo-ls': 'yes' },
      hasStreamingByGame: { 'jojo-ls': 'unknown' },
      attributeSources: {
        businessHours: 'admin',
        smoking: 'user-report',
      },
    }
    expect(store.businessHours).toBe('10:00-23:00')
    expect(store.floor).toBe('2F')
    expect(store.smoking).toBe('no')
    expect(store.payments).toEqual(['Suica', 'PayPay'])
    expect(store.hasRecordingByGame?.['jojo-ls']).toBe('yes')
    expect(store.hasStreamingByGame?.['jojo-ls']).toBe('unknown')
    expect(store.attributeSources?.businessHours).toBe('admin')
    expect(store.attributeSources?.smoking).toBe('user-report')
  })

  it('新属性フィールドはすべて任意（省略してもStore型に適合する）', () => {
    const store: Store = {
      id: 'test-004',
      name: '最小店舗',
      address: '東京都',
      lat: 35.0,
      lng: 139.0,
      games: ['gundam-exvs'],
    }
    expect(store.businessHours).toBeUndefined()
    expect(store.floor).toBeUndefined()
    expect(store.smoking).toBeUndefined()
    expect(store.payments).toBeUndefined()
    expect(store.hasRecordingByGame).toBeUndefined()
    expect(store.hasStreamingByGame).toBeUndefined()
    expect(store.attributeSources).toBeUndefined()
  })

  it('attributeSources は Provenance 値を各キーに設定できる', () => {
    const store: Store = {
      id: 'test-005',
      name: '出どころ確認店舗',
      address: '大阪府',
      lat: 34.69,
      lng: 135.5,
      games: ['jojo-ls'],
      attributeSources: {
        floor: 'official',
        payments: 'admin',
        hasStreamingByGame: 'user-report',
      },
    }
    expect(store.attributeSources?.floor).toBe('official')
    expect(store.attributeSources?.payments).toBe('admin')
    expect(store.attributeSources?.hasStreamingByGame).toBe('user-report')
    expect(store.attributeSources?.businessHours).toBeUndefined()
  })
})
