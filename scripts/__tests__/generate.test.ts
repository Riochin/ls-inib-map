import { describe, it, expect } from 'vitest'
import { generateStoresFile, hasMeaningfulDiff } from '../generate'
import type { GeocodedStore } from '../geocode'
import type { StoresFile } from '@/types/stores-file'
import type { GameTitle } from '@/types/store'

const SOURCE = {
  jojols: 'https://example.com/jojols',
  gundam: 'https://example.com/gundam',
}

/** テスト用の座標付きマージ済み店舗を生成するヘルパ */
function geocodedStore(overrides: Partial<GeocodedStore> = {}): GeocodedStore {
  return {
    id: overrides.id ?? 'id-1',
    name: overrides.name ?? '新宿スポーツランド',
    address: overrides.address ?? '東京都新宿区新宿3-22-12 高層ビル5F',
    normalizedAddress: overrides.normalizedAddress ?? '東京都新宿区新宿3-22-12',
    games: overrides.games ?? (['gundam-exvs'] as [GameTitle, ...GameTitle[]]),
    area: overrides.area ?? 'JP-13',
    lat: overrides.lat ?? 35.69,
    lng: overrides.lng ?? 139.7,
    ...overrides,
  }
}

describe('generateStoresFile', () => {
  it('生成時刻を lastUpdated として埋め込み出典を付与する', () => {
    const file = generateStoresFile({
      stores: [geocodedStore()],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    expect(file.lastUpdated).toBe('2026-06-08T00:00:00.000Z')
    expect(file.source).toEqual(SOURCE)
  })

  it('パイプライン専有フィールド(normalizedAddress/area)を落として Store へ変換する', () => {
    const file = generateStoresFile({
      stores: [geocodedStore()],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    expect(file.stores[0]).toEqual({
      id: 'id-1',
      name: '新宿スポーツランド',
      address: '東京都新宿区新宿3-22-12 高層ビル5F',
      lat: 35.69,
      lng: 139.7,
      games: ['gundam-exvs'],
    })
    expect(file.stores[0]).not.toHaveProperty('normalizedAddress')
    expect(file.stores[0]).not.toHaveProperty('area')
  })

  it('closed/delisted フラグは設定時のみ保持する', () => {
    const file = generateStoresFile({
      stores: [
        geocodedStore({ id: 'a', closed: true }),
        geocodedStore({ id: 'b', delisted: true }),
        geocodedStore({ id: 'c' }),
      ],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    const byId = Object.fromEntries(file.stores.map((s) => [s.id, s]))
    expect(byId.a.closed).toBe(true)
    expect(byId.b.delisted).toBe(true)
    expect(byId.c).not.toHaveProperty('closed')
    expect(byId.c).not.toHaveProperty('delisted')
  })

  it('machineCounts は非空時のみ保持し、空オブジェクトは省略する', () => {
    const file = generateStoresFile({
      stores: [
        geocodedStore({ id: 'a', machineCounts: { 'gundam-exvs': 3 } }),
        geocodedStore({ id: 'b', machineCounts: {} }),
        geocodedStore({ id: 'c' }),
      ],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    const byId = Object.fromEntries(file.stores.map((s) => [s.id, s]))
    expect(byId.a.machineCounts).toEqual({ 'gundam-exvs': 3 })
    expect(byId.b).not.toHaveProperty('machineCounts')
    expect(byId.c).not.toHaveProperty('machineCounts')
  })

  it('店舗を id 昇順に整列して出力の決定論性を担保する', () => {
    const file = generateStoresFile({
      stores: [geocodedStore({ id: 'c' }), geocodedStore({ id: 'a' }), geocodedStore({ id: 'b' })],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    expect(file.stores.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('officialTotals は指定時のみ付与する', () => {
    const withTotals = generateStoresFile({
      stores: [geocodedStore()],
      source: SOURCE,
      officialTotals: { jojols: 100, gundam: 200 },
      now: '2026-06-08T00:00:00.000Z',
    })
    expect(withTotals.officialTotals).toEqual({ jojols: 100, gundam: 200 })

    const without = generateStoresFile({
      stores: [geocodedStore()],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    expect(without).not.toHaveProperty('officialTotals')
  })

  it('座標が数値でない店舗は例外で中断する（必須フィールド保証）', () => {
    expect(() =>
      generateStoresFile({
        stores: [geocodedStore({ lat: Number.NaN })],
        source: SOURCE,
        now: '2026-06-08T00:00:00.000Z',
      }),
    ).toThrow()
  })

  it('タイトルが空の店舗は例外で中断する（必須フィールド保証）', () => {
    expect(() =>
      generateStoresFile({
        stores: [geocodedStore({ games: [] as unknown as [GameTitle, ...GameTitle[]] })],
        source: SOURCE,
        now: '2026-06-08T00:00:00.000Z',
      }),
    ).toThrow()
  })
})

describe('hasMeaningfulDiff', () => {
  const base: StoresFile = {
    lastUpdated: '2026-06-08T00:00:00.000Z',
    source: SOURCE,
    stores: [
      {
        id: 'id-1',
        name: '新宿スポーツランド',
        address: '東京都新宿区新宿3-22-12',
        lat: 35.69,
        lng: 139.7,
        games: ['gundam-exvs'],
      },
    ],
  }

  it('現行が無ければ差分ありと判定する', () => {
    expect(hasMeaningfulDiff(null, base)).toBe(true)
  })

  it('lastUpdated のみの差分は差分なしと判定する', () => {
    const next: StoresFile = { ...base, lastUpdated: '2026-07-01T12:34:56.000Z' }
    expect(hasMeaningfulDiff(base, next)).toBe(false)
  })

  it('店舗の実体差分は差分ありと判定する', () => {
    const next: StoresFile = {
      ...base,
      lastUpdated: '2026-07-01T12:34:56.000Z',
      stores: [{ ...base.stores[0], lat: 35.7 }],
    }
    expect(hasMeaningfulDiff(base, next)).toBe(true)
  })

  it('キー順の違いは差分なしと判定する（正規化比較）', () => {
    const reordered: StoresFile = {
      stores: base.stores,
      source: base.source,
      lastUpdated: 'different',
    } as StoresFile
    expect(hasMeaningfulDiff(base, reordered)).toBe(false)
  })

  it('officialTotals の差分は差分ありと判定する', () => {
    const next: StoresFile = { ...base, officialTotals: { jojols: 1, gundam: 2 } }
    expect(hasMeaningfulDiff(base, next)).toBe(true)
  })
})
