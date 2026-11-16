import { describe, it, expect, vi } from 'vitest'
import {
  parseListHtml,
  cleanScrapedAddress,
  isAreaReliable,
  isNationalTotalAnomalous,
  buildListUrl,
  scrapeStores,
  ScrapeAbortError,
  ALL_AREA_TARGETS,
} from '../scrape'
import type { RawStore, ScrapeResult, SiteKey } from '../types'

/**
 * 公式一覧HTMLの実構造を模した固定フィクスチャ。
 * 店舗一覧は `<dl>` 内の「`<dt>`（店名アンカー・`detail?loc_id=...`）→
 * `<dd class="address">` → `<dd class="count">`（`N台設置`）」のフラットな繰り返し
 * （`scrape.ts` の `parseListHtml` と対応）。
 */
function fixtureHtml(
  items: Array<{ locId: string; name: string; address: string; machine: string }>,
): string {
  const rows = items
    .map(
      (it) => `
      <dt><a href="./detail?loc_id=${it.locId}">${it.name}</a></dt>
      <dd class="address">${it.address}</dd>
      <dd class="count">${it.machine}</dd>`,
    )
    .join('')
  return `<html><body><dl>${rows}</dl></body></html>`
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
      '<dl>' +
      // loc_id を欠く（href にクエリなし）
      '<dt><a href="./detail">名無し</a></dt>' +
      '<dd class="address">東京都新宿区</dd><dd class="count">1台設置</dd>' +
      // 住所を欠く
      '<dt><a href="./detail?loc_id=1">店</a></dt>' +
      '<dd class="count">1台設置</dd>' +
      '</dl>'
    expect(parseListHtml(broken, 'jojols', 'JP-13')).toEqual([])
  })

  it('台数表記が無い場合は machineCount を 0 とする', () => {
    const html =
      '<dl><dt><a href="./detail?loc_id=9">店X</a></dt>' +
      '<dd class="address">大阪府大阪市北区1-1</dd></dl>'
    const [store] = parseListHtml(html, 'gundam', 'JP-27')
    expect(store.machineCount).toBe(0)
  })
})

describe('cleanScrapedAddress', () => {
  it('構成要素間の半角空白を詰め、建物名（全角空白区切り）は半角空白1つで連結する', () => {
    expect(cleanScrapedAddress('東京都 豊島区 東池袋 1-22-10　ヒューマックスパビリオン1F')).toBe(
      '東京都豊島区東池袋1-22-10 ヒューマックスパビリオン1F',
    )
  })

  it('建物名が無い住所は空白を全て詰める', () => {
    expect(cleanScrapedAddress('東京都 千代田区 外神田 1-10-9')).toBe('東京都千代田区外神田1-10-9')
  })

  it('整形後の住所はクライアントの parseAddress が区/市を取得できる形になる', () => {
    // parseAddress は都道府県以降の先頭空白で取りこぼすため、空白詰めが前提
    const cleaned = cleanScrapedAddress('神奈川県 横浜市 西区 南幸 1-1-1')
    expect(cleaned).toBe('神奈川県横浜市西区南幸1-1-1')
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
    // 前回件数が分からない0件も不確定（構造変化の可能性）
    expect(isAreaReliable(0, undefined)).toBe(false)
  })

  it('前回もそのサイトの掲載が0件なら、0件でも信頼（true）', () => {
    expect(isAreaReliable(0, 0)).toBe(true)
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

/** サイトの正常取得エリアを並べ替えて返す */
function areasOf(result: ScrapeResult, site: SiteKey): string[] {
  return [...(result.scrapedAreas.get(site) ?? [])].sort()
}

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
    expect(areasOf(result, 'jojols')).toEqual(['JP-01', 'JP-02'])
    expect(areasOf(result, 'gundam')).toEqual(['JP-01', 'JP-02'])
    expect(result.skippedSites).toEqual([])
    // 過負荷回避のためリクエスト間隔を空ける（sleep が呼ばれる）
    expect(sleep).toHaveBeenCalled()
  })

  it('エリアの取得失敗時、そのエリアを scrapedAreas から除外し店舗も含めない', async () => {
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'area=JP-02': new Error('network down') }),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    expect(areasOf(result, 'jojols')).toEqual(['JP-01'])
    expect(areasOf(result, 'gundam')).toEqual(['JP-01'])
    expect(result.stores.every((s) => s.area === 'JP-01')).toBe(true)
  })

  it('片方のサイトの1エリアだけ失敗したら、そのサイト×エリアだけ除外する', async () => {
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'ac2ib/location/list?area=JP-02': new Error('HTTP 403') }),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    expect(areasOf(result, 'jojols')).toEqual(['JP-01', 'JP-02'])
    expect(areasOf(result, 'gundam')).toEqual(['JP-01'])
    // jojols×2 + gundam×1
    expect(result.stores).toHaveLength(3)
    expect(result.skippedSites).toEqual([])
  })

  it('イニブ公式が全エリアで失敗しても、ラスサバの分だけ返しイニブを skippedSites に入れる', async () => {
    const log = vi.fn()
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'gundam-vs.jp': new Error('HTTP 403') }),
      areas: twoAreas,
      prevTotals: new Map([
        ['jojols', 2],
        ['gundam', 2],
      ]),
      sleep: vi.fn().mockResolvedValue(undefined),
      log,
    })

    expect(result.skippedSites).toEqual(['gundam'])
    expect(areasOf(result, 'jojols')).toEqual(['JP-01', 'JP-02'])
    expect(result.scrapedAreas.has('gundam')).toBe(false)
    expect(result.stores.every((s) => s.site === 'jojols')).toBe(true)
    expect(result.stores).toHaveLength(2)
    const messages = log.mock.calls.map((c) => c[0] as string)
    expect(messages.some((m) => m.includes('サイト除外') && m.includes('gundam'))).toBe(true)
  })

  it('0件のエリアは不確定として除外する', async () => {
    const empty = fixtureHtml([])
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'area=JP-02': empty }),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
    })
    expect(areasOf(result, 'jojols')).toEqual(['JP-01'])
    expect(areasOf(result, 'gundam')).toEqual(['JP-01'])
  })

  it('片方のサイトだけ取れた週、そのサイトの店が前回も無かったエリアの0件は正常取得として扱う', async () => {
    const empty = fixtureHtml([])
    const result = await scrapeStores({
      fetcher: buildFetcher({
        'gundam-vs.jp': new Error('HTTP 403'),
        'jojols/location/list?area=JP-02': empty,
      }),
      areas: twoAreas,
      // jojols は JP-02 に前回店舗なし（記載の無い area は前回0件）
      prevAreaCounts: new Map([
        ['jojols', new Map([['JP-01', 1]])],
        ['gundam', new Map([['JP-01', 1], ['JP-02', 1]])],
      ]),
      prevTotals: new Map([
        ['jojols', 1],
        ['gundam', 2],
      ]),
      sleep: vi.fn().mockResolvedValue(undefined),
    })
    expect(result.skippedSites).toEqual(['gundam'])
    expect(areasOf(result, 'jojols')).toEqual(['JP-01', 'JP-02'])
  })

  it('両サイト取れたエリアは件数を合算して判定し、片方の0件だけでは不確定にしない', async () => {
    const empty = fixtureHtml([])
    const result = await scrapeStores({
      // gundam は JP-02 の最後の1店が消えて0件、jojols は掲載継続
      fetcher: buildFetcher({ 'ac2ib/location/list?area=JP-02': empty }),
      areas: twoAreas,
      prevAreaCounts: new Map([
        ['jojols', new Map([['JP-01', 1], ['JP-02', 1]])],
        ['gundam', new Map([['JP-01', 1], ['JP-02', 1]])],
      ]),
      sleep: vi.fn().mockResolvedValue(undefined),
    })
    // 合算 1件 / 前回 2件 = 50% → 信頼。gundam も JP-02 を正常取得扱い（消えた店を移設判定できる）
    expect(areasOf(result, 'gundam')).toEqual(['JP-01', 'JP-02'])
  })

  it('全国総数が前回比で極端に減少した場合は中断し既存データを破壊しない', async () => {
    // 両サイトとも全エリア取得失敗で全国件数が0 → 両サイト除外で中断
    await expect(
      scrapeStores({
        fetcher: buildFetcher({
          'area=JP-01': new Error('down'),
          'area=JP-02': new Error('down'),
        }),
        areas: twoAreas,
        prevTotals: new Map([
          ['jojols', 500],
          ['gundam', 500],
        ]),
        sleep: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toBeInstanceOf(ScrapeAbortError)
  })

  it('area ごとの進捗と完了サマリーを log で通知する', async () => {
    const log = vi.fn()
    await scrapeStores({
      fetcher: buildFetcher(),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
      log,
    })

    const messages = log.mock.calls.map((c) => c[0] as string)
    // リクエストごとの進捗（件数つき）
    expect(messages.some((m) => /\(\d+\/\d+\).*JP-01.*jojols.*1件/.test(m))).toBe(true)
    // 完了サマリー
    expect(messages.some((m) => /完了: jojols 2\/2エリア, gundam 2\/2エリア, 総店舗=4件/.test(m))).toBe(true)
  })

  it('フェッチのタイムアウト（例外）はそのエリアを失敗扱いにし log へ記録する', async () => {
    const log = vi.fn()
    const timeoutErr = Object.assign(new Error('The operation was aborted due to timeout'), {
      name: 'TimeoutError',
    })
    const result = await scrapeStores({
      fetcher: buildFetcher({ 'area=JP-02': timeoutErr }),
      areas: twoAreas,
      sleep: vi.fn().mockResolvedValue(undefined),
      log,
    })

    expect(areasOf(result, 'jojols')).toEqual(['JP-01'])
    const messages = log.mock.calls.map((c) => c[0] as string)
    expect(messages.some((m) => m.includes('JP-02') && m.includes('失敗'))).toBe(true)
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
    expect(areasOf(result, 'jojols')).toEqual(['JP-13'])
    expect(areasOf(result, 'gundam')).toEqual(['JP-13'])
    // sw1/sw0 × 2サイト = 4店舗
    expect(result.stores).toHaveLength(4)
  })
})
