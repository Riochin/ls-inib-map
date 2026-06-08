import { describe, it, expect, vi } from 'vitest'
import { runPipeline } from '../pipeline'
import type { GeocodeResult } from '../geocode'
import type { Store } from '@/types/store'
import type { StoresMeta } from '@/types/stores-file'

/**
 * パイプライン結合（Req2.4, 3.1, 3.2, 5.1）の結合テスト。
 *
 * scrape → merge → geocode(モック) → generate の各段を連結し、固定HTMLフィクスチャと
 * モックジオコーダから妥当な生成物 {@link StoresFile} が得られることを検証する。
 * 外部I/O（HTML取得・Geocoding API）は全て依存注入で差し替える。
 */

const SOURCE: StoresMeta['source'] = {
  jojols: 'https://example.com/jojols',
  gundam: 'https://example.com/gundam',
}
const NOW = '2026-06-08T00:00:00.000Z'

/** 一覧HTMLフィクスチャ（scrape.ts の LIST_SELECTORS と対応） */
function fixtureHtml(
  items: Array<{ locId: string; name: string; address: string; machine: string }>,
): string {
  const lis = items
    .map(
      (it) => `
      <li class="location-list__item">
        <a class="location-list__name" href="detail?loc_id=${it.locId}">${it.name}</a>
        <p class="location-list__address">${it.address}</p>
        <p class="location-list__machine">${it.machine}</p>
      </li>`,
    )
    .join('')
  return `<html><body><ul class="location-list">${lis}</ul></body></html>`
}

/**
 * area×site ごとにフィクスチャHTMLを返すフェッチャ。
 * - JP-01: 同一店舗「店A」が両サイトに掲載（マージで games 合成される・前回未掲載＝新規ジオコード）
 * - JP-27: jojols のみ「店B」（前回掲載・座標引き継ぎ）
 */
function buildFetcher(): (url: string) => Promise<string> {
  return async (url: string) => {
    const area = url.match(/area=(JP-\d+)/)?.[1] ?? 'JP-00'
    if (area === 'JP-01') {
      return fixtureHtml([
        { locId: `a-${area}`, name: '店A', address: '北海道札幌市中央区南1-1-1', machine: '2台設置' },
      ])
    }
    if (area === 'JP-27') {
      if (url.includes('jojols')) {
        return fixtureHtml([
          { locId: 'b-27', name: '店B', address: '大阪府大阪市北区梅田1-1', machine: '1台設置' },
        ])
      }
      return fixtureHtml([])
    }
    return fixtureHtml([])
  }
}

const AREAS = [{ area: 'JP-01' }, { area: 'JP-27' }]

describe('runPipeline', () => {
  it('フィクスチャから妥当な StoresFile を生成する（メタ埋込・両サイト合成・座標補完）', async () => {
    const geocodeFn = vi.fn(
      async (): Promise<GeocodeResult> => ({ lat: 43.06, lng: 141.35 }),
    )

    // 前回データ: 店B は掲載継続（座標引き継ぎ）、店C は JP-27 から消失（移設判定）
    const prev: Store[] = [
      {
        id: 'b-old',
        name: '店B',
        address: '大阪府大阪市北区梅田1-1',
        lat: 34.7,
        lng: 135.5,
        games: ['jojo-ls'],
      },
      {
        id: 'c-old',
        name: '店C',
        address: '大阪府大阪市中央区難波2-2',
        lat: 34.66,
        lng: 135.5,
        games: ['gundam-exvs'],
      },
    ]

    const result = await runPipeline({
      scrape: {
        fetcher: buildFetcher(),
        areas: AREAS,
        sleep: vi.fn().mockResolvedValue(undefined),
        delayMs: 0,
      },
      prev,
      geocode: { geocodeFn, apiKey: 'test-key', sleep: vi.fn().mockResolvedValue(undefined), delayMs: 0 },
      source: SOURCE,
      now: NOW,
    })

    const { file } = result

    // メタ情報の埋め込み（Req5.1）
    expect(file.lastUpdated).toBe(NOW)
    expect(file.source).toEqual(SOURCE)

    // 店A（両サイト合成）/ 店B（掲載継続）/ 店C（移設） の3件
    expect(file.stores).toHaveLength(3)

    // 全店舗が数値座標を持つ（生成器の必須フィールド保証）
    for (const s of file.stores) {
      expect(typeof s.lat).toBe('number')
      expect(Number.isFinite(s.lat)).toBe(true)
      expect(typeof s.lng).toBe('number')
      expect(Number.isFinite(s.lng)).toBe(true)
    }

    // 両サイト掲載の店A は games が合成される
    const a = file.stores.find((s) => s.name === '店A')
    expect(a?.games).toEqual(['jojo-ls', 'gundam-exvs'])

    // 掲載継続の店B は前回座標を引き継ぐ（再ジオコードしない）
    const b = file.stores.find((s) => s.name === '店B')
    expect(b).toMatchObject({ lat: 34.7, lng: 135.5 })
    expect(b?.delisted).toBeUndefined()

    // JP-27 で消失した店C は移設判定（前回座標維持）
    const c = file.stores.find((s) => s.name === '店C')
    expect(c?.delisted).toBe(true)
    expect(c).toMatchObject({ lat: 34.66, lng: 135.5 })

    // 新規ジオコードは店A の1件のみ（B/C は前回座標引き継ぎでAPI未呼び出し）
    expect(geocodeFn).toHaveBeenCalledTimes(1)
    expect(result.geocodedCount).toBe(1)
    expect(result.skipped).toEqual([])

    // 取得成功エリア集合を伝搬する
    expect([...result.scrapedAreas].sort()).toEqual(['JP-01', 'JP-27'])

    // 出力は id 昇順（決定論的な差分）
    const ids = file.stores.map((s) => s.id)
    expect([...ids].sort()).toEqual(ids)
  })

  it('新規ジオコード結果はキャッシュへ追記され書き戻し対象になる', async () => {
    const geocodeFn = vi.fn(async (): Promise<GeocodeResult> => ({ lat: 43.06, lng: 141.35 }))

    const result = await runPipeline({
      scrape: {
        fetcher: buildFetcher(),
        areas: [{ area: 'JP-01' }],
        sleep: vi.fn().mockResolvedValue(undefined),
        delayMs: 0,
      },
      prev: [],
      geocode: { geocodeFn, apiKey: 'test-key', sleep: vi.fn().mockResolvedValue(undefined), delayMs: 0 },
      source: SOURCE,
      now: NOW,
    })

    // 店A の正規化住所がキャッシュへ追記される
    expect(Object.keys(result.cache)).toContain('北海道札幌市中央区南1-1-1')
    expect(result.cache['北海道札幌市中央区南1-1-1']).toEqual({ lat: 43.06, lng: 141.35 })
  })

  it('スクレイプ取得失敗エリアの前回店舗は移設判定されず前回状態を維持する', async () => {
    // JP-01 の取得を全失敗させる → scrapedAreas から除外され、当該エリアの前回店舗は維持
    const fetcher = async (url: string): Promise<string> => {
      if (url.includes('area=JP-01')) throw new Error('network down')
      return fixtureHtml([])
    }
    const prev: Store[] = [
      {
        id: 'hk-old',
        name: '店HK',
        address: '北海道札幌市中央区南2-2-2',
        lat: 43.05,
        lng: 141.34,
        games: ['jojo-ls'],
      },
    ]

    const result = await runPipeline({
      scrape: {
        fetcher,
        areas: [{ area: 'JP-01' }],
        sleep: vi.fn().mockResolvedValue(undefined),
        delayMs: 0,
      },
      prev,
      geocode: { geocodeFn: vi.fn(), apiKey: 'test-key', sleep: vi.fn().mockResolvedValue(undefined) },
      source: SOURCE,
      now: NOW,
    })

    expect(result.scrapedAreas.has('JP-01')).toBe(false)
    const hk = result.file.stores.find((s) => s.name === '店HK')
    expect(hk).toBeDefined()
    expect(hk?.delisted).toBeUndefined()
  })
})
