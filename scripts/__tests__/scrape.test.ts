import { describe, it, expect, vi } from 'vitest'
import {
  parseListHtml,
  isAreaReliable,
  isNationalTotalAnomalous,
  buildListUrl,
  scrapeStores,
  ScrapeAbortError,
  ALL_AREA_TARGETS,
} from '../scrape'
import type { RawStore, SiteKey } from '../types'

/**
 * 公式一覧HTMLの想定構造を模した固定フィクスチャ。
 * 1店舗 = `.location-list__item`、店舗名アンカーの href に `loc_id`、
 * 住所と「N台設置」を子要素に持つ（`scrape.ts` の LIST_SELECTORS と対応）。
 */
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

describe('parseListHtml', () => {
  it('一覧HTMLから店舗（名前/住所/台数/loc_id/area/site）を抽出する', () => {
    const html = fixtureHtml([
      {
        locId: '13001',
        name: '新宿スポーツランド',
        address: '東京都新宿区新宿3-22-12',
        machine: '3台設置',
      },
      {
        locId: '13002',
        name: 'ゲームセンター渋谷',
        address: '東京都渋谷区道玄坂2-1-1',
        machine: '2台設置',
      },
    ])

    const stores = parseListHtml(html, 'jojols', 'JP-13')

    expect(stores).toEqual<RawStore[]>([
      {
        site: 'jojols',
        locId: '13001',
        name: '新宿スポーツランド',
        address: '東京都新宿区新宿3-22-12',
        machineCount: 3,
        area: 'JP-13',
      },
      {
        site: 'jojols',
        locId: '13002',
        name: 'ゲームセンター渋谷',
        address: '東京都渋谷区道玄坂2-1-1',
        machineCount: 2,
        area: 'JP-13',
      },
    ])
  })

  it('店舗が存在しない一覧では空配列を返す', () => {
    expect(parseListHtml(fixtureHtml([]), 'gundam', 'JP-47')).toEqual([])
  })

  it('必須項目（名前/住所/loc_id）を欠く要素はスキップする', () => {
    const broken =
      '<ul class="location-list">' +
      // loc_id を欠く（href にクエリなし）
      '<li class="location-list__item"><a class="location-list__name" href="detail">名無し</a>' +
      '<p class="location-list__address">東京都新宿区</p><p class="location-list__machine">1台設置</p></li>' +
      // 住所を欠く
      '<li class="location-list__item"><a class="location-list__name" href="detail?loc_id=1">店</a>' +
      '<p class="location-list__machine">1台設置</p></li>' +
      '</ul>'
    expect(parseListHtml(broken, 'jojols', 'JP-13')).toEqual([])
  })

  it('台数表記が無い場合は machineCount を 0 とする', () => {
    const html =
      '<ul class="location-list"><li class="location-list__item">' +
      '<a class="location-list__name" href="detail?loc_id=9">店X</a>' +
      '<p class="location-list__address">大阪府大阪市北区1-1</p></li></ul>'
    const [store] = parseListHtml(html, 'gundam', 'JP-27')
    expect(store.machineCount).toBe(0)
  })
})

describe('buildListUrl', () => {
  it('site と area から一覧URLを組み立てる', () => {
    expect(buildListUrl('jojols', { area: 'JP-01' })).toContain('area=JP-01')
  })

  it('東京の23区/多摩分割パラメータ（sw）を付与する', () => {
    const url = buildListUrl('gundam', { area: 'JP-13', params: { sw: '1' } })
    expect(url).toContain('area=JP-13')
    expect(url).toContain('sw=1')
  })
})

describe('ALL_AREA_TARGETS', () => {
  it('全47都道府県を網羅し、東京は sw=1/sw=0 の2分割で列挙する', () => {
    const areas = new Set(ALL_AREA_TARGETS.map((t) => t.area))
    expect(areas.size).toBe(47)
    expect(areas.has('JP-01')).toBe(true)
    expect(areas.has('JP-47')).toBe(true)
    const tokyo = ALL_AREA_TARGETS.filter((t) => t.area === 'JP-13')
    expect(tokyo).toHaveLength(2)
    expect(tokyo.map((t) => t.params?.sw).sort()).toEqual(['0', '1'])
  })
})

describe('isAreaReliable', () => {
  it('取得件数が0なら不確定（false）', () => {
    expect(isAreaReliable(0, 10)).toBe(false)
  })

  it('比較対象（前回件数）が無ければ取得できている限り信頼（true）', () => {
    expect(isAreaReliable(5, undefined)).toBe(true)
    expect(isAreaReliable(5, 0)).toBe(true)
  })

  it('前回比で急減（既定50%未満）なら不確定（false）', () => {
    expect(isAreaReliable(4, 10)).toBe(false)
  })

  it('前回比で妥当な範囲なら信頼（true）', () => {
    expect(isAreaReliable(9, 10)).toBe(true)
    expect(isAreaReliable(20, 10)).toBe(true)
  })
})

describe('isNationalTotalAnomalous', () => {
  it('全国総数が前回比で極端に減少（既定50%未満）なら異常（true）', () => {
    expect(isNationalTotalAnomalous(100, 1000)).toBe(true)
  })

  it('妥当な範囲または比較対象なしなら正常（false）', () => {
    expect(isNationalTotalAnomalous(900, 1000)).toBe(false)
    expect(isNationalTotalAnomalous(500, undefined)).toBe(false)
    expect(isNationalTotalAnomalous(500, 0)).toBe(false)
  })
})

describe('scrapeStores', () => {
  // 2エリア×2サイトの最小フィクスチャを返すフェッチャを構築する
  function buildFetcher(
    overrides: Record<string, string | Error> = {},
  ): (url: string) => Promise<string> {
    return async (url: string) => {
      for (const [needle, value] of Object.entries(overrides)) {
        if (url.includes(needle)) {
          if (value instanceof Error) throw value
          return value
        }
      }
      // 既定: area ごとに1店舗を返す
      const area = url.match(/area=(JP-\d+)/)?.[1] ?? 'JP-00'
      const site: SiteKey = url.includes('jojols') ? 'jojols' : 'gundam'
      return fixtureHtml([
        {
          locId: `${site}-${area}`,
          name: `店-${site}-${area}`,
          address: `住所-${area}`,
          machine: '1台設置',
        },
      ])
    }
  }

  const twoAreas = [{ area: 'JP-01' }, { area: 'JP-02' }]

  it('全エリア×両サイトを取得し、店舗と取得成功エリア集合を返す', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const result = await scrapeStores({
      fetcher: buildFetcher(),
      areas: twoAreas,
      sleep,
      delayMs: 10,
    })

    // 2エリア × 2サイト = 4店舗
    expect(result.stores).toHaveLength(4)
    expect([...result.scrapedAreas].sort()).toEqual(['JP-01', 'JP-02'])
    // 過負荷回避のためリクエスト間隔を空ける（sleep が呼ばれる）
    expect(sleep).toHaveBeenCalled()
  })

  it('エリアの取得失敗時、そのエリアを scrapedAreas から除外し店舗も含めない', async () => {
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'area=JP-02': new Error('network down') }),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    expect([...result.scrapedAreas]).toEqual(['JP-01'])
    expect(result.stores.every((s) => s.area === 'JP-01')).toBe(true)
  })

  it('0件のエリアは不確定として除外する', async () => {
    const empty = fixtureHtml([])
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'area=JP-02': empty }),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
    })
    expect([...result.scrapedAreas]).toEqual(['JP-01'])
  })

  it('全国総数が前回比で極端に減少した場合は中断し既存データを破壊しない', async () => {
    // 両エリア取得失敗で全国総数が0 → 前回1000比で異常中断
    await expect(
      scrapeStores({
        fetcher: buildFetcher({
          'area=JP-01': new Error('down'),
          'area=JP-02': new Error('down'),
        }),
        areas: twoAreas,
        prevTotal: 1000,
        sleep: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toBeInstanceOf(ScrapeAbortError)
  })

  it('東京エリアは sw 分割の両方が取得できた場合に scrapedAreas へ含める', async () => {
    const result = await scrapeStores({
      fetcher: buildFetcher(),
      areas: [
        { area: 'JP-13', params: { sw: '1' } },
        { area: 'JP-13', params: { sw: '0' } },
      ],
      sleep: vi.fn().mockResolvedValue(undefined),
    })
    expect([...result.scrapedAreas]).toEqual(['JP-13'])
    // sw1/sw0 × 2サイト = 4店舗
    expect(result.stores).toHaveLength(4)
  })
})
