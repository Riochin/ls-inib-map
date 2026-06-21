import { describe, it, expect, vi } from 'vitest'
import {
  normalizeTaitoHours,
  normalizeNamcoName,
  hasMeaningfulDiff,
  scrapeTaito,
  scrapeTaitoFlagship,
  scrapeNamco,
} from '../scrape-chain-attributes'

// ---------------------------------------------------------------------------
// normalizeTaitoHours
// ---------------------------------------------------------------------------

describe('normalizeTaitoHours', () => {
  it('一桁時刻を0埋めし ～ を - に変換する', () => {
    expect(normalizeTaitoHours('9:00～21:00')).toBe('09:00-21:00')
  })

  it('二桁はそのまま', () => {
    expect(normalizeTaitoHours('10:00～24:00')).toBe('10:00-24:00')
  })

  it('深夜 00:00 閉店を 24:00 に変換する', () => {
    expect(normalizeTaitoHours('10:00～00:00')).toBe('10:00-24:00')
  })

  it('全角 ～ を処理する', () => {
    expect(normalizeTaitoHours('11:00～23:00')).toBe('11:00-23:00')
  })

  it('不正形式は null', () => {
    expect(normalizeTaitoHours('')).toBeNull()
    expect(normalizeTaitoHours('定休日')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// normalizeNamcoName
// ---------------------------------------------------------------------------

describe('normalizeNamcoName', () => {
  it('先頭の "namco " を除去する', () => {
    expect(normalizeNamcoName('namco 池袋')).toBe('池袋')
    expect(normalizeNamcoName('namco池袋')).toBe('池袋')
  })

  it('全角を半角に正規化する', () => {
    expect(normalizeNamcoName('namco　池袋')).toBe('池袋') // 全角スペース
  })

  it('大文字 NAMCO にも対応する', () => {
    expect(normalizeNamcoName('NAMCO IKEBUKURO')).toBe('ikebukuro')
  })

  it('namco 部分が無ければそのまま', () => {
    expect(normalizeNamcoName('松戸')).toBe('松戸')
  })
})

// ---------------------------------------------------------------------------
// hasMeaningfulDiff
// ---------------------------------------------------------------------------

describe('hasMeaningfulDiff', () => {
  it('updatedAt のみの差は差分なしと判定する', () => {
    const prev = {
      overrides: {
        abc: { source: 'auto-scrape', businessHours: '10:00-22:00', updatedAt: '2026-01-01' },
      },
    }
    const next = {
      overrides: {
        abc: { source: 'auto-scrape', businessHours: '10:00-22:00', updatedAt: '2026-06-20' },
      },
    }
    expect(hasMeaningfulDiff(prev, next)).toBe(false)
  })

  it('businessHours が変わった場合は差分ありと判定する', () => {
    const prev = {
      overrides: {
        abc: { source: 'auto-scrape', businessHours: '10:00-22:00', updatedAt: '2026-01-01' },
      },
    }
    const next = {
      overrides: {
        abc: { source: 'auto-scrape', businessHours: '10:00-23:00', updatedAt: '2026-01-01' },
      },
    }
    expect(hasMeaningfulDiff(prev, next)).toBe(true)
  })

  it('新規エントリ追加は差分ありと判定する', () => {
    const prev = { overrides: {} }
    const next = {
      overrides: { abc: { source: 'auto-scrape', officialUrl: 'https://example.com/' } },
    }
    expect(hasMeaningfulDiff(prev, next)).toBe(true)
  })

  it('空のオーバーライド同士は差分なし', () => {
    expect(hasMeaningfulDiff({ overrides: {} }, { overrides: {} })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// scrapeTaito（fetchJson モック）
// ---------------------------------------------------------------------------

describe('scrapeTaito', () => {
  const ourStores = [
    { id: 'store-taito-001', name: 'タイトーステーション池袋', address: '東京都豊島区東池袋1-22-10' },
    { id: 'store-taito-002', name: 'タイトーステーション渋谷', address: '東京都渋谷区宇田川町21-1' },
  ]

  it('住所一致でエントリを生成する', async () => {
    // 実際の API 構造: Array<{ StoreData: {...} }>
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          StoreData: {
            StoreID: '00001234',
            StoreName: 'タイトーステーション池袋',
            CountryCode: 'JP',
            Status: 'A',
            BusinessHours: '10:00～24:00',
            State: '東京都',
            City: '豊島区',
            Address1: '東池袋1丁目22-10',
            Latitude: 35.72968,
            Longitude: 139.715769,
          },
        },
      ],
    })
    vi.stubGlobal('fetch', mockFetch)

    const { matched, unmatched } = await scrapeTaito(ourStores, { log: () => {} })

    expect(matched.size).toBe(1)
    const entry = matched.get('store-taito-001')
    expect(entry?.officialUrl).toBe('https://www.taito.co.jp/store/00001234')
    expect(entry?.businessHours).toBe('10:00-24:00')
    expect(entry?.lat).toBeCloseTo(35.72968)
    expect(entry?.lng).toBeCloseTo(139.715769)
    expect(unmatched).toHaveLength(0)

    vi.unstubAllGlobals()
  })

  it('海外店（CountryCode≠JP）は除外する', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          StoreData: {
            StoreID: '99999',
            StoreName: 'TAITO STATION USA',
            CountryCode: 'US',
            Status: 'A',
            BusinessHours: '10:00～22:00',
            State: '東京都',
            City: '豊島区',
            Address1: '東池袋1-22-10',
          },
        },
      ],
    })
    vi.stubGlobal('fetch', mockFetch)

    const { matched } = await scrapeTaito(ourStores, { log: () => {} })
    expect(matched.size).toBe(0)

    vi.unstubAllGlobals()
  })

  it('一致しない店舗は unmatched に記録する', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          StoreData: {
            StoreID: '99998',
            CountryCode: 'JP',
            Status: 'A',
            StoreName: 'タイトーステーション不明店',
            State: '北海道',
            City: '札幌市北区',
            Address1: '新琴似3条3丁目1-1',
            BusinessHours: '10:00～22:00',
          },
        },
      ],
    })
    vi.stubGlobal('fetch', mockFetch)

    const { matched, unmatched } = await scrapeTaito(ourStores, { log: () => {} })
    expect(matched.size).toBe(0)
    expect(unmatched.length).toBeGreaterThan(0)

    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// scrapeTaitoFlagship（シード経由）
// ---------------------------------------------------------------------------

describe('scrapeTaitoFlagship', () => {
  const flagshipJsonLd = (name: string, opens: string, closes: string): string =>
    `<script type="application/ld+json">${JSON.stringify({
      '@type': 'LocalBusiness',
      name,
      address: { addressRegion: '東京都', addressLocality: '豊島区', streetAddress: '西池袋1-15-9' },
      openingHoursSpecification: [{ dayOfWeek: ['Monday'], opens, closes }],
    })}</script>`

  it('シードURLを叩いて営業時間を取得し、公式URLはシード値を採用する', async () => {
    const seed = {
      'store-001': 'https://www.taito.co.jp/store/00002136',
      'store-002': 'https://www.taito.co.jp/store/00002138',
    }
    const fetcher = vi.fn().mockImplementation(async (u: string) => {
      if (u.endsWith('00002136')) return flagshipJsonLd('池袋西口', '10:00:00', '00:00:00')
      if (u.endsWith('00002138')) return flagshipJsonLd('札幌狸小路', '10:00:00', '23:30:00')
      return '<html></html>'
    })

    const { matched, unmatched } = await scrapeTaitoFlagship(seed, {
      delayMs: 0,
      log: () => {},
      fetcher,
    })

    expect(matched.size).toBe(2)
    // 深夜0時 → 24:00 正規化
    expect(matched.get('store-001')?.businessHours).toBe('10:00-24:00')
    expect(matched.get('store-001')?.officialUrl).toBe('https://www.taito.co.jp/store/00002136')
    expect(matched.get('store-002')?.businessHours).toBe('10:00-23:30')
    // JSON-LD に geo は無い＝lat/lng は上書きしない（既存ジオコード維持）
    expect(matched.get('store-001')?.lat).toBeUndefined()
    expect(unmatched).toHaveLength(0)
  })

  it('取得失敗は unmatched に記録し、他店は続行する', async () => {
    const seed = {
      'store-001': 'https://www.taito.co.jp/store/00002136',
      'store-bad': 'https://www.taito.co.jp/store/00009999',
    }
    const fetcher = vi.fn().mockImplementation(async (u: string) => {
      if (u.endsWith('00002136')) return flagshipJsonLd('池袋西口', '10:00:00', '23:00:00')
      throw new Error('HTTP 404')
    })

    const { matched, unmatched } = await scrapeTaitoFlagship(seed, {
      delayMs: 0,
      log: () => {},
      fetcher,
    })

    expect(matched.size).toBe(1)
    expect(matched.has('store-001')).toBe(true)
    expect(unmatched.some((u) => u.includes('store-bad'))).toBe(true)
  })

  it('シードが空なら何もしない', async () => {
    const { matched, unmatched } = await scrapeTaitoFlagship({}, { log: () => {} })
    expect(matched.size).toBe(0)
    expect(unmatched).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// scrapeNamco（fetch モック）
// ---------------------------------------------------------------------------

describe('scrapeNamco', () => {
  // 我々の DB は "店" なしの短い名前。API は "…店" や中間 "店"・施設サフィックス付き。
  const ourStores = [
    { id: 'store-namco-001', name: 'namco池袋', address: '東京都豊島区東池袋1-22-10' },
    { id: 'store-namco-002', name: 'namcoイオンレイクタウンmori北', address: '埼玉県越谷市レイクタウン3-1-1' },
    { id: 'store-namco-003', name: 'namcoワンダーシティ南熊本', address: '熊本県熊本市中央区九品寺6-9-1' },
    { id: 'store-namco-004', name: 'namco巣鴨よ永遠に', address: '東京都豊島区巣鴨1-15-1' },
  ]

  // 実際のレスポンス構造: { hits: { hits: [{ _source: {...} }] } }
  const mockSearchResult = {
    hits: {
      total: 5,
      hits: [
        { _source: { name: 'namco 池袋店', url: '/game_center/loc/ikebukuro/' } }, // 末尾 "店"
        { _source: { name: 'namcoイオンレイクタウン店 mori北', url: '/game_center/loc/laketown/' } }, // 中間 "店"
        // 施設サフィックス（ボウリング）と本体ゲームセンターが両方ある → 本体を選ぶべき
        { _source: { name: 'namcoワンダーシティ南熊本店ワンダーボウル', url: '/game_center/loc/bw-kumamoto-minami/' } },
        { _source: { name: 'namcoワンダーシティ南熊本店', url: '/game_center/loc/kumamoto-minami/' } },
        { _source: { name: 'GiGO 秋葉原', url: '/game_center/loc/akihabara-gigo/' } }, // namco でない → 除外
      ],
    },
  }

  const minimalJsonLd = (slug: string, hours: string, lat: number, lng: number): string =>
    `<script type="application/ld+json">${JSON.stringify({
      '@type': 'EntertainmentBusiness',
      name: slug,
      url: `https://bandainamco-am.co.jp/game_center/loc/${slug}/`,
      geo: { latitude: lat, longitude: lng },
      openingHoursSpecification: [{ dayOfWeek: 'Monday', opens: hours.split('-')[0], closes: hours.split('-')[1] }],
    })}</script>`

  it('"店" サフィックス・中間"店"・施設サフィックスを吸収して名寄せする', async () => {
    const mockFetchJson = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSearchResult,
    })
    vi.stubGlobal('fetch', mockFetchJson)

    // fetcher は呼ばれた URL に応じて JSON-LD を返す
    const fetcher = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('ikebukuro')) return minimalJsonLd('ikebukuro', '10:00-23:00', 35.729, 139.715)
      if (url.includes('laketown')) return minimalJsonLd('laketown', '10:00-22:00', 35.879, 139.79)
      if (url.includes('kumamoto-minami') && !url.includes('bw-'))
        return minimalJsonLd('kumamoto-minami', '10:00-24:00', 32.78, 130.71)
      return '<html></html>'
    })

    const { matched, unmatched } = await scrapeNamco(ourStores, {
      delayMs: 0,
      log: () => {},
      fetcher,
    })

    // 池袋・レイクタウン・南熊本の3件が一致、巣鴨（API未収録）は未一致
    expect(matched.size).toBe(3)
    expect(matched.get('store-namco-001')?.businessHours).toBe('10:00-23:00')
    expect(matched.get('store-namco-002')?.officialUrl).toContain('laketown')
    // 施設サフィックス付き(bw-)ではなく本体(kumamoto-minami)を選ぶ
    expect(matched.get('store-namco-003')?.officialUrl).toContain('kumamoto-minami')
    expect(matched.get('store-namco-003')?.officialUrl).not.toContain('bw-')
    expect(matched.has('store-namco-004')).toBe(false)
    expect(unmatched.some((u) => u.includes('巣鴨'))).toBe(true)

    vi.unstubAllGlobals()
  })
})
