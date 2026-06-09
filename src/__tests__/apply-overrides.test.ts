import { describe, it, expect, vi, afterEach } from 'vitest'
import { applyOverrides } from '@/lib/apply-overrides'
import type { Store } from '@/types/store'
import type { OverridesFile } from '@/types/overrides'

function makeStore(extra: Partial<Store> = {}): Store {
  return {
    id: 'abc123',
    name: '店',
    address: '東京都',
    lat: 35.68,
    lng: 139.77,
    games: ['jojo-ls', 'gundam-exvs'],
    machineCounts: { 'jojo-ls': 4, 'gundam-exvs': 9 },
    ...extra,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('applyOverrides', () => {
  it('overrideが空なら入力をそのまま返す（同一参照）', () => {
    const stores = [makeStore()]
    expect(applyOverrides(stores, { overrides: {} })).toBe(stores)
  })

  it('台数を上書きし、そのゲームの出どころを countSources に記録する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'user-report', machineCounts: { 'gundam-exvs': 7 } } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.machineCounts).toEqual({ 'jojo-ls': 4, 'gundam-exvs': 7 })
    expect(store.countSources).toEqual({ 'gundam-exvs': 'user-report' })
  })

  it('上書きしていないゲームには countSources を付けない（=公式扱い）', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', machineCounts: { 'jojo-ls': 3 } } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.countSources).toEqual({ 'jojo-ls': 'admin' })
    expect(store.countSources?.['gundam-exvs']).toBeUndefined()
  })

  it('台数以外のフィールド（closed・name）も適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', closed: true, name: '新名称' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.closed).toBe(true)
    expect(store.name).toBe('新名称')
  })

  it('複数ゲームの台数を同時に上書きできる', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: {
        abc123: { source: 'admin', machineCounts: { 'jojo-ls': 2, 'gundam-exvs': 6 } },
      },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.machineCounts).toEqual({ 'jojo-ls': 2, 'gundam-exvs': 6 })
    expect(store.countSources).toEqual({ 'jojo-ls': 'admin', 'gundam-exvs': 'admin' })
  })

  it('どの店舗にも当たらない override ID は console.warn する', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const stores = [makeStore()]
    applyOverrides(stores, {
      overrides: { nope999: { source: 'user-report', note: '謎の店', machineCounts: { 'jojo-ls': 1 } } },
    })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('nope999')
    expect(warn.mock.calls[0][0]).toContain('謎の店')
  })

  it('入力の Store オブジェクトを破壊しない', () => {
    const stores = [makeStore()]
    const before = structuredClone(stores[0])
    applyOverrides(stores, {
      overrides: { abc123: { source: 'user-report', machineCounts: { 'gundam-exvs': 7 } } },
    })
    expect(stores[0]).toEqual(before)
  })
})
