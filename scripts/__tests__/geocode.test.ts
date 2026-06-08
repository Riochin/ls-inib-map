import { describe, it, expect, vi } from 'vitest'
import {
  geocodeStores,
  buildGeocodeUrl,
  parseGeocodeResponse,
  type GeocodeCache,
} from '../geocode'
import type { GameTitle } from '@/types/store'
import type { MergedStore } from '../types'

/** テスト用のマージ済み店舗を生成するヘルパ（ジオコード前・座標なし） */
function mergedStore(overrides: Partial<MergedStore> = {}): MergedStore {
  return {
    id: overrides.id ?? 'id-1',
    name: overrides.name ?? '新宿スポーツランド',
    address: overrides.address ?? '東京都新宿区新宿3-22-12 高層ビル5F',
    normalizedAddress: overrides.normalizedAddress ?? '東京都新宿区新宿3-22-12',
    games: overrides.games ?? (['gundam-exvs'] as [GameTitle, ...GameTitle[]]),
    area: overrides.area ?? 'JP-13',
    ...overrides,
  }
}

describe('buildGeocodeUrl', () => {
  it('住所をエンコードし日本語/地域バイアスとキーを付与する', () => {
    const url = buildGeocodeUrl('東京都新宿区新宿3-22-12', 'KEY123')
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe(
      'https://maps.googleapis.com/maps/api/geocode/json',
    )
    expect(parsed.searchParams.get('address')).toBe('東京都新宿区新宿3-22-12')
    expect(parsed.searchParams.get('key')).toBe('KEY123')
    expect(parsed.searchParams.get('language')).toBe('ja')
    expect(parsed.searchParams.get('region')).toBe('jp')
  })
})

describe('parseGeocodeResponse', () => {
  it('status=OK の先頭結果から座標を取り出す', () => {
    const body = {
      status: 'OK',
      results: [{ geometry: { location: { lat: 35.69, lng: 139.7 } } }],
    }
    expect(parseGeocodeResponse(body)).toEqual({ lat: 35.69, lng: 139.7 })
  })

  it('ZERO_RESULTS や結果なしは null を返す', () => {
    expect(parseGeocodeResponse({ status: 'ZERO_RESULTS', results: [] })).toBeNull()
    expect(parseGeocodeResponse({ status: 'OK', results: [] })).toBeNull()
  })
})

describe('geocodeStores', () => {
  it('キャッシュヒット時はAPIを呼ばず座標を返す', async () => {
    const cache: GeocodeCache = {
      '東京都新宿区新宿3-22-12': { lat: 35.69, lng: 139.7 },
    }
    const geocodeFn = vi.fn()
    const result = await geocodeStores([mergedStore()], {
      cache,
      geocodeFn,
      apiKey: 'KEY',
    })

    expect(geocodeFn).not.toHaveBeenCalled()
    expect(result.stores).toHaveLength(1)
    expect(result.stores[0]).toMatchObject({ lat: 35.69, lng: 139.7 })
    expect(result.geocodedCount).toBe(0)
  })

  it('未ヒットの住所のみAPIへ問い合わせ結果をキャッシュへ追記する', async () => {
    const cache: GeocodeCache = {}
    const geocodeFn = vi.fn().mockResolvedValue({ lat: 34.7, lng: 135.5 })
    const result = await geocodeStores([mergedStore()], {
      cache,
      geocodeFn,
      apiKey: 'KEY',
    })

    expect(geocodeFn).toHaveBeenCalledTimes(1)
    expect(geocodeFn).toHaveBeenCalledWith('東京都新宿区新宿3-22-12 高層ビル5F', 'KEY')
    expect(result.stores[0]).toMatchObject({ lat: 34.7, lng: 135.5 })
    // キャッシュは正規化住所をキーに追記される（commit対象）
    expect(result.cache['東京都新宿区新宿3-22-12']).toEqual({ lat: 34.7, lng: 135.5 })
    expect(result.geocodedCount).toBe(1)
  })

  it('同一正規化住所の複数店舗は1回だけAPIを呼ぶ', async () => {
    const cache: GeocodeCache = {}
    const geocodeFn = vi.fn().mockResolvedValue({ lat: 34.7, lng: 135.5 })
    const a = mergedStore({ id: 'a', name: '店A', address: '大阪市A 1-1 ビルA' })
    const b = mergedStore({ id: 'b', name: '店B', address: '大阪市A 1-1 ビルB' })
    // 同一番地・別店舗名は別キー（merge側の責務）だが、ここでは同一正規化住所を強制
    a.normalizedAddress = '大阪市A1-1'
    b.normalizedAddress = '大阪市A1-1'

    const result = await geocodeStores([a, b], { cache, geocodeFn, apiKey: 'KEY' })

    expect(geocodeFn).toHaveBeenCalledTimes(1)
    expect(result.stores).toHaveLength(2)
    expect(result.stores.every((s) => s.lat === 34.7)).toBe(true)
  })

  it('既に座標を持つ店舗（前回値引き継ぎ）はAPIを呼ばず維持する', async () => {
    const geocodeFn = vi.fn()
    const carried = mergedStore({ id: 'd', delisted: true, lat: 1, lng: 2 })
    const result = await geocodeStores([carried], { cache: {}, geocodeFn, apiKey: 'KEY' })

    expect(geocodeFn).not.toHaveBeenCalled()
    expect(result.stores[0]).toMatchObject({ lat: 1, lng: 2, delisted: true })
  })

  it('個別ジオコード失敗時は当該店舗をスキップしログ記録して継続する', async () => {
    const log = vi.fn()
    const geocodeFn = vi
      .fn()
      .mockResolvedValueOnce(null) // 1件目: 失敗（結果なし）
      .mockResolvedValueOnce({ lat: 34.7, lng: 135.5 }) // 2件目: 成功
    const ok = mergedStore({ id: 'ok', normalizedAddress: '住所OK' })
    const ng = mergedStore({ id: 'ng', normalizedAddress: '住所NG' })

    const result = await geocodeStores([ng, ok], { cache: {}, geocodeFn, apiKey: 'KEY', log })

    expect(result.stores.map((s) => s.id)).toEqual(['ok'])
    expect(result.skipped).toEqual(['ng'])
    expect(log).toHaveBeenCalled()
  })

  it('APIが例外を投げても当該店舗をスキップして継続する', async () => {
    const geocodeFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ lat: 34.7, lng: 135.5 })
    const result = await geocodeStores(
      [
        mergedStore({ id: 'ng', normalizedAddress: 'A' }),
        mergedStore({ id: 'ok', normalizedAddress: 'B' }),
      ],
      { cache: {}, geocodeFn, apiKey: 'KEY' },
    )
    expect(result.stores.map((s) => s.id)).toEqual(['ok'])
    expect(result.skipped).toEqual(['ng'])
  })

  it('APIキー未設定でジオコードが必要な場合は例外を投げる', async () => {
    await expect(
      geocodeStores([mergedStore()], { cache: {}, geocodeFn: vi.fn(), apiKey: undefined }),
    ).rejects.toThrow()
  })

  it('API呼び出しの間に待機を挟む（過負荷回避）', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const geocodeFn = vi.fn().mockResolvedValue({ lat: 1, lng: 1 })
    await geocodeStores(
      [
        mergedStore({ id: 'a', normalizedAddress: 'A' }),
        mergedStore({ id: 'b', normalizedAddress: 'B' }),
      ],
      { cache: {}, geocodeFn, apiKey: 'KEY', sleep, delayMs: 50 },
    )
    expect(sleep).toHaveBeenCalledWith(50)
  })
})
