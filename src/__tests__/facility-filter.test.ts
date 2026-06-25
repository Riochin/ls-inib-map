import { describe, it, expect } from 'vitest'
import { totalMachineCount, filterStoresByFacility } from '@/lib/facility-filter'
import { EMPTY_FACILITY_FILTER } from '@/types/store'
import type { Store, FacilityFilter } from '@/types/store'

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

function facility(partial: Partial<FacilityFilter>): FacilityFilter {
  return { ...EMPTY_FACILITY_FILTER, ...partial }
}

describe('totalMachineCount', () => {
  it('全ゲームの台数を合計する', () => {
    expect(totalMachineCount(store({ id: 'a', machineCounts: { 'jojo-ls': 3, 'gundam-exvs': 2 } }))).toBe(5)
  })

  it('machineCounts 未設定は 0', () => {
    expect(totalMachineCount(store({ id: 'b' }))).toBe(0)
  })

  it('一部キーのみでも合計できる', () => {
    expect(totalMachineCount(store({ id: 'c', machineCounts: { 'jojo-ls': 4 } }))).toBe(4)
  })
})

describe('filterStoresByFacility', () => {
  it('空フィルターは全通過', () => {
    const stores = [store({ id: 'a' }), store({ id: 'b' })]
    expect(filterStoresByFacility(stores, EMPTY_FACILITY_FILTER, 'all')).toHaveLength(2)
  })

  it('最低台数で合計未満を除外する', () => {
    const stores = [
      store({ id: 'few', machineCounts: { 'jojo-ls': 2 } }),
      store({ id: 'many', machineCounts: { 'jojo-ls': 3 } }),
      store({ id: 'none' }),
    ]
    const result = filterStoresByFacility(stores, facility({ minMachines: 3 }), 'all')
    expect(result.map((s) => s.id)).toEqual(['many'])
  })

  it('配信台ありは yes のみ通過（unknown/未設定は除外）', () => {
    const stores = [
      store({ id: 'yes', hasStreamingByGame: { 'jojo-ls': 'yes' } }),
      store({ id: 'unknown', hasStreamingByGame: { 'jojo-ls': 'unknown' } }),
      store({ id: 'no', hasStreamingByGame: { 'jojo-ls': 'no' } }),
      store({ id: 'unset' }),
    ]
    const result = filterStoresByFacility(stores, facility({ hasStreaming: true }), 'all')
    expect(result.map((s) => s.id)).toEqual(['yes'])
  })

  it('録画台ありはいずれかのゲームが yes なら通過', () => {
    const stores = [
      store({ id: 'g2', hasRecordingByGame: { 'jojo-ls': 'no', 'gundam-exvs': 'yes' } }),
      store({ id: 'none', hasRecordingByGame: { 'jojo-ls': 'no' } }),
    ]
    const result = filterStoresByFacility(stores, facility({ hasRecording: true }), 'all')
    expect(result.map((s) => s.id)).toEqual(['g2'])
  })

  it('喫煙所ありは smoking === yes のみ', () => {
    const stores = [
      store({ id: 'yes', smoking: 'yes' }),
      store({ id: 'unknown', smoking: 'unknown' }),
      store({ id: 'unset' }),
    ]
    const result = filterStoresByFacility(stores, facility({ hasSmoking: true }), 'all')
    expect(result.map((s) => s.id)).toEqual(['yes'])
  })

  it('営業中は closed / delisted を除外する', () => {
    const stores = [
      store({ id: 'open' }),
      store({ id: 'closed', closed: true }),
      store({ id: 'delisted', delisted: true }),
    ]
    const result = filterStoresByFacility(stores, facility({ openOnly: true }), 'all')
    expect(result.map((s) => s.id)).toEqual(['open'])
  })

  it('複数条件は AND（配信あり かつ 営業中）', () => {
    const stores = [
      store({ id: 'ok', hasStreamingByGame: { 'jojo-ls': 'yes' } }),
      store({ id: 'closed', hasStreamingByGame: { 'jojo-ls': 'yes' }, closed: true }),
      store({ id: 'nostream' }),
    ]
    const result = filterStoresByFacility(stores, facility({ hasStreaming: true, openOnly: true }), 'all')
    expect(result.map((s) => s.id)).toEqual(['ok'])
  })
})

describe('filterStoresByFacility（ゲーム連動）', () => {
  it('録画台あり＋ラスサバ選択は、イニブのみ録画台ありの店を除外する', () => {
    const stores = [
      store({ id: 'ls', hasRecordingByGame: { 'jojo-ls': 'yes', 'gundam-exvs': 'no' } }),
      store({ id: 'exvs-only', hasRecordingByGame: { 'jojo-ls': 'no', 'gundam-exvs': 'yes' } }),
    ]
    const result = filterStoresByFacility(stores, facility({ hasRecording: true }), 'jojo-ls')
    expect(result.map((s) => s.id)).toEqual(['ls'])
  })

  it('配信台あり＋イニブ選択は、ラスサバのみ配信台ありの店を除外する', () => {
    const stores = [
      store({ id: 'exvs', hasStreamingByGame: { 'gundam-exvs': 'yes' } }),
      store({ id: 'ls-only', hasStreamingByGame: { 'jojo-ls': 'yes' } }),
    ]
    const result = filterStoresByFacility(stores, facility({ hasStreaming: true }), 'gundam-exvs')
    expect(result.map((s) => s.id)).toEqual(['exvs'])
  })

  it('最低台数は選択ゲームの台数のみで判定する（イニブ選択）', () => {
    const stores = [
      // ラスサバは多いがイニブは少ない → イニブ選択では除外
      store({ id: 'ls-heavy', machineCounts: { 'jojo-ls': 8, 'gundam-exvs': 2 } }),
      // イニブが8台 → 通過
      store({ id: 'exvs-heavy', machineCounts: { 'jojo-ls': 1, 'gundam-exvs': 8 } }),
    ]
    const result = filterStoresByFacility(stores, facility({ minMachines: 8 }), 'gundam-exvs')
    expect(result.map((s) => s.id)).toEqual(['exvs-heavy'])
  })

  it("'all' 選択時は従来どおり横断（合計／いずれか）で判定する", () => {
    const stores = [
      store({ id: 'sum', machineCounts: { 'jojo-ls': 5, 'gundam-exvs': 3 } }),
      store({ id: 'rec', hasRecordingByGame: { 'gundam-exvs': 'yes' } }),
    ]
    expect(filterStoresByFacility(stores, facility({ minMachines: 8 }), 'all').map((s) => s.id)).toEqual([
      'sum',
    ])
    expect(filterStoresByFacility(stores, facility({ hasRecording: true }), 'all').map((s) => s.id)).toEqual([
      'rec',
    ])
  })
})
