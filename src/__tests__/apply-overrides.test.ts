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

  it('位置(lat/lng)を上書きすると approximateLocation を解除する（手動補正＝確定）', () => {
    const stores = [makeStore({ approximateLocation: true })]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', lat: 36.0, lng: 137.0 } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.lat).toBe(36.0)
    expect(store.lng).toBe(137.0)
    expect(store.approximateLocation).toBe(false)
  })

  it('位置を上書きしなければ approximateLocation はそのまま維持する', () => {
    const stores = [makeStore({ approximateLocation: true })]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', machineCounts: { 'jojo-ls': 3 } } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.approximateLocation).toBe(true)
  })

  it('updatedAt は infoUpdatedAt として Store に載る', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: {
        abc123: { source: 'admin', updatedAt: '2026-06-10T00:00:00.000Z', machineCounts: { 'jojo-ls': 3 } },
      },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.infoUpdatedAt).toBe('2026-06-10T00:00:00.000Z')
  })

  it('updatedAt が無ければ infoUpdatedAt は未設定', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', machineCounts: { 'jojo-ls': 3 } } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.infoUpdatedAt).toBeUndefined()
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

describe('applyOverrides - 新属性（attributeSources）', () => {
  it('businessHours を OverrideEntry から Store に適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', businessHours: '10:00-23:00' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.businessHours).toBe('10:00-23:00')
  })

  it('floor を適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', floor: '2F' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.floor).toBe('2F')
  })

  it('smoking を適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'user-report', smoking: 'no' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.smoking).toBe('no')
  })

  it('payments 配列を適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', payments: ['Suica', 'PayPay'] } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.payments).toEqual(['Suica', 'PayPay'])
  })

  it('hasRecording を適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', hasRecording: 'yes' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.hasRecording).toBe('yes')
  })

  it('hasStreaming を適用する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', hasStreaming: 'unknown' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.hasStreaming).toBe('unknown')
  })

  it('適用した属性の source を attributeSources に記録する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: {
        abc123: { source: 'user-report', businessHours: '11:00-22:00', floor: '3F' },
      },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.attributeSources?.businessHours).toBe('user-report')
    expect(store.attributeSources?.floor).toBe('user-report')
  })

  it('source=admin を attributeSources に正しく記録する', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', smoking: 'yes', hasRecording: 'no' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.attributeSources?.smoking).toBe('admin')
    expect(store.attributeSources?.hasRecording).toBe('admin')
  })

  it('含まれない属性は attributeSources に記録しない', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', businessHours: '10:00-23:00' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.attributeSources?.floor).toBeUndefined()
    expect(store.attributeSources?.smoking).toBeUndefined()
  })

  it('全属性を一括適用できる', () => {
    const stores = [makeStore()]
    const file: OverridesFile = {
      overrides: {
        abc123: {
          source: 'admin',
          businessHours: '10:00-23:00',
          floor: '2F',
          smoking: 'no',
          payments: ['Suica'],
          hasRecording: 'yes',
          hasStreaming: 'no',
        },
      },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.businessHours).toBe('10:00-23:00')
    expect(store.floor).toBe('2F')
    expect(store.smoking).toBe('no')
    expect(store.payments).toEqual(['Suica'])
    expect(store.hasRecording).toBe('yes')
    expect(store.hasStreaming).toBe('no')
    const src = store.attributeSources!
    expect(src.businessHours).toBe('admin')
    expect(src.floor).toBe('admin')
    expect(src.smoking).toBe('admin')
    expect(src.payments).toBe('admin')
    expect(src.hasRecording).toBe('admin')
    expect(src.hasStreaming).toBe('admin')
  })

  it('既存の Store に attributeSources があれば既存値を保持しつつ更新する', () => {
    const stores = [makeStore({ attributeSources: { floor: 'official' } })]
    const file: OverridesFile = {
      overrides: { abc123: { source: 'admin', businessHours: '10:00-23:00' } },
    }
    const [store] = applyOverrides(stores, file)
    expect(store.attributeSources?.floor).toBe('official')
    expect(store.attributeSources?.businessHours).toBe('admin')
  })

  it('入力の Store（新属性含む）を破壊しない', () => {
    const stores = [makeStore({ businessHours: '09:00-21:00', floor: '1F' })]
    const before = structuredClone(stores[0])
    applyOverrides(stores, {
      overrides: { abc123: { source: 'admin', businessHours: '10:00-23:00' } },
    })
    expect(stores[0]).toEqual(before)
  })
})
