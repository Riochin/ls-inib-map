import { describe, it, expect } from 'vitest'
import {
  computeCompleteness,
  completenessLevel,
  filterStoresByCompleteness,
  RICH_THRESHOLD,
  POOR_THRESHOLD,
} from '@/lib/completeness'
import type { Store } from '@/types/store'

function store(partial: Partial<Store> & Pick<Store, 'id'>): Store {
  return {
    name: partial.id,
    address: '東京都新宿区1-1',
    lat: 0,
    lng: 0,
    games: ['jojo-ls'],
    ...partial,
  }
}

const FULL: Store = store({
  id: 'full',
  businessHours: '10:00-23:00',
  floor: '2F',
  smoking: 'no',
  payments: ['Suica'],
  officialUrl: 'https://example.com',
  machineCounts: { 'jojo-ls': 3 },
  hasStreamingByGame: { 'jojo-ls': 'yes' },
})

describe('computeCompleteness', () => {
  it('全7項目埋まりは filled 7 / total 7', () => {
    expect(computeCompleteness(FULL)).toEqual({ filled: 7, total: 7 })
  })

  it('任意情報なしは filled 0 / total 7', () => {
    expect(computeCompleteness(store({ id: 'empty' }))).toEqual({ filled: 0, total: 7 })
  })

  it('空文字の businessHours はカウントしない', () => {
    expect(computeCompleteness(store({ id: 'bh', businessHours: '' })).filled).toBe(0)
  })

  it('空配列の payments はカウントしない', () => {
    expect(computeCompleteness(store({ id: 'pay', payments: [] })).filled).toBe(0)
  })

  it('floorByGame だけでも floor 項目を1カウント', () => {
    expect(computeCompleteness(store({ id: 'fbg', floorByGame: { 'jojo-ls': '3F' } })).filled).toBe(1)
  })

  it('hasRecordingByGame だけでも設備項目を1カウント', () => {
    expect(
      computeCompleteness(store({ id: 'rec', hasRecordingByGame: { 'jojo-ls': 'yes' } })).filled,
    ).toBe(1)
  })

  it('smoking unknown も「定義済み」としてカウントする', () => {
    expect(computeCompleteness(store({ id: 'sm', smoking: 'unknown' })).filled).toBe(1)
  })
})

describe('completenessLevel', () => {
  it('既定閾値: filled 6 は rich', () => {
    const s = store({
      id: 'r',
      businessHours: '10-23',
      floor: '2F',
      smoking: 'no',
      payments: ['x'],
      officialUrl: 'http://x',
      machineCounts: { 'jojo-ls': 1 },
    })
    expect(completenessLevel(s)).toBe('rich')
  })

  it('既定閾値: filled 1 は poor', () => {
    expect(completenessLevel(store({ id: 'p', floor: '1F' }))).toBe('poor')
  })

  it('既定閾値: filled 3 は mid', () => {
    const s = store({ id: 'm', floor: '1F', smoking: 'no', payments: ['x'] })
    expect(completenessLevel(s)).toBe('mid')
  })

  it('閾値は既定 rich=5 / poor=2', () => {
    expect(RICH_THRESHOLD).toBe(5)
    expect(POOR_THRESHOLD).toBe(2)
  })

  it('閾値引数で境界を変えられる', () => {
    const s = store({ id: 't', floor: '1F', smoking: 'no' }) // filled 2
    expect(completenessLevel(s, 2, 0)).toBe('rich')
  })
})

describe('filterStoresByCompleteness', () => {
  const stores = [
    FULL, // rich
    store({ id: 'mid', floor: '1F', smoking: 'no', payments: ['x'] }), // filled 3 -> mid
    store({ id: 'poor', floor: '1F' }), // filled 1 -> poor
  ]

  it("'all' は全通過", () => {
    expect(filterStoresByCompleteness(stores, 'all')).toHaveLength(3)
  })

  it("'rich' は充実店のみ", () => {
    expect(filterStoresByCompleteness(stores, 'rich').map((s) => s.id)).toEqual(['full'])
  })

  it("'poor' は不足店のみ", () => {
    expect(filterStoresByCompleteness(stores, 'poor').map((s) => s.id)).toEqual(['poor'])
  })
})
