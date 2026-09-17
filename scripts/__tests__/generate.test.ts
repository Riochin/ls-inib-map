import { describe, it, expect } from 'vitest'
import { generateStoresFile, hasMeaningfulDiff, computePrefectureUpdatedAt } from '../generate'
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

  it('精度が APPROXIMATE の店舗にだけ approximateLocation を付与する', () => {
    const file = generateStoresFile({
      stores: [
        geocodedStore({ id: 'a', precision: 'APPROXIMATE' }),
        geocodedStore({ id: 'b', precision: 'ROOFTOP' }),
        geocodedStore({ id: 'c', precision: 'ROOFTOP', partialMatch: true }),
        geocodedStore({ id: 'd' }),
      ],
      source: SOURCE,
      now: '2026-06-08T00:00:00.000Z',
    })
    const byId = Object.fromEntries(file.stores.map((s) => [s.id, s]))
    expect(byId.a.approximateLocation).toBe(true)
    expect(byId.b).not.toHaveProperty('approximateLocation')
    // partial_match だけでは付けない（ビル名付き住所の誤検知防止）
    expect(byId.c).not.toHaveProperty('approximateLocation')
    expect(byId.d).not.toHaveProperty('approximateLocation')
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
})

describe('computePrefectureUpdatedAt', () => {
  const NOW = '2026-09-16T00:00:00.000Z'
  const PREV = '2026-09-09T00:00:00.000Z'
  const tokyo = generateStoresFile({ stores: [geocodedStore({ id: 'tk-1' })], source: SOURCE, now: PREV }).stores[0]
  const osaka = generateStoresFile({
    stores: [geocodedStore({ id: 'os-1', address: '大阪府大阪市北区梅田1-1-1', area: 'JP-27' })],
    source: SOURCE,
    now: PREV,
  }).stores[0]
  const current: StoresFile = {
    lastUpdated: PREV,
    source: SOURCE,
    prefectureUpdatedAt: { 東京都: '2026-08-01T00:00:00.000Z', 大阪府: '2026-07-01T00:00:00.000Z' },
    stores: [tokyo, osaka],
  }

  it('現行が無い（初回）場合は全県を生成時刻にする', () => {
    expect(computePrefectureUpdatedAt(null, [tokyo, osaka], NOW)).toEqual({
      東京都: NOW,
      大阪府: NOW,
    })
  })

  it('店舗集合が変わらない県は前回値を引き継ぐ', () => {
    expect(computePrefectureUpdatedAt(current, [tokyo, osaka], NOW)).toEqual(
      current.prefectureUpdatedAt,
    )
  })

  it('店舗の実体差分（台数変更・閉店フラグ等）があった県だけ生成時刻へ進める', () => {
    const changedTokyo = { ...tokyo, machineCounts: { 'gundam-exvs': 9 } }
    expect(computePrefectureUpdatedAt(current, [changedTokyo, osaka], NOW)).toEqual({
      東京都: NOW,
      大阪府: '2026-07-01T00:00:00.000Z',
    })
    const delistedOsaka = { ...osaka, delisted: true }
    expect(computePrefectureUpdatedAt(current, [tokyo, delistedOsaka], NOW)).toEqual({
      東京都: '2026-08-01T00:00:00.000Z',
      大阪府: NOW,
    })
  })

  it('新たに店舗が現れた県は生成時刻、店舗が無くなった県はキーごと落とす', () => {
    const nagoya = { ...tokyo, id: 'ai-1', address: '愛知県名古屋市中区栄1-1-1' }
    expect(computePrefectureUpdatedAt(current, [tokyo, nagoya], NOW)).toEqual({
      東京都: '2026-08-01T00:00:00.000Z',
      愛知県: NOW,
    })
  })

  it('現行に県別値が無い（旧生成物）場合、変わらない県は現行の lastUpdated を下限として使う', () => {
    const legacy: StoresFile = { lastUpdated: PREV, source: SOURCE, stores: [tokyo, osaka] }
    expect(computePrefectureUpdatedAt(legacy, [tokyo, osaka], NOW)).toEqual({
      東京都: PREV,
      大阪府: PREV,
    })
  })

  it('generateStoresFile は prefectureUpdatedAt を埋め込み、現行を渡すと引き継ぐ', () => {
    const file = generateStoresFile({
      stores: [geocodedStore({ id: 'tk-1' })],
      source: SOURCE,
      now: NOW,
      current,
    })
    expect(file.prefectureUpdatedAt).toEqual({ 東京都: '2026-08-01T00:00:00.000Z' })
  })
})
