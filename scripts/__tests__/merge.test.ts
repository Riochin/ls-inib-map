import { describe, it, expect } from 'vitest'
import { normalizeAddress, deriveId, mergeStores } from '../merge'
import type { RawStore, MergedStore, ScrapedAreasBySite, SiteKey } from '../types'
import type { Store } from '@/types/store'

// ---------------------------------------------------------------------------
// テスト用ヘルパ
// ---------------------------------------------------------------------------

function raw(overrides: Partial<RawStore> & Pick<RawStore, 'site' | 'name' | 'address'>): RawStore {
  return {
    locId: overrides.locId ?? `${overrides.site}-${overrides.name}`,
    machineCount: overrides.machineCount ?? 1,
    area: overrides.area ?? 'JP-13',
    ...overrides,
  }
}

/** 両サイトとも同じ地域を正常取得できた状態（従来の地域単位の判定と同じ） */
function bothSites(areas: string[]): ScrapedAreasBySite {
  return new Map<SiteKey, Set<string>>([
    ['jojols', new Set(areas)],
    ['gundam', new Set(areas)],
  ])
}

/** 片方のサイトだけ取得できた状態（もう片方は全地域で取得失敗） */
function onlySite(site: SiteKey, areas: string[]): ScrapedAreasBySite {
  return new Map<SiteKey, Set<string>>([[site, new Set(areas)]])
}

/** MergedStore を次回 prev として再投入するための Store 化（座標を補完） */
function asPrev(stores: MergedStore[]): Store[] {
  return stores.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    lat: s.lat ?? 35,
    lng: s.lng ?? 139,
    games: s.games,
    ...(s.machineCounts ? { machineCounts: s.machineCounts } : {}),
    ...(s.closed ? { closed: true as const } : {}),
    ...(s.delisted ? { delisted: true as const } : {}),
  }))
}

// ---------------------------------------------------------------------------
// normalizeAddress（Req2.4）
// ---------------------------------------------------------------------------

describe('normalizeAddress', () => {
  it('全角英数字・全角空白を半角へ正規化する', () => {
    expect(normalizeAddress('東京都新宿区新宿３－２２－１２')).toBe('東京都新宿区新宿3-22-12')
  })

  it('丁目・番・番地・号を単一のハイフンへ正規化する', () => {
    expect(normalizeAddress('東京都新宿区新宿3丁目22番12号')).toBe('東京都新宿区新宿3-22-12')
    expect(normalizeAddress('東京都新宿区新宿3丁目22番地12')).toBe('東京都新宿区新宿3-22-12')
  })

  it('各種ハイフン（全角/長音/ダッシュ）を単一のハイフンへ統一する', () => {
    expect(normalizeAddress('東京都新宿区新宿3－22ー12')).toBe('東京都新宿区新宿3-22-12')
    expect(normalizeAddress('東京都新宿区新宿3―22−12')).toBe('東京都新宿区新宿3-22-12')
  })

  it('建物名を統合キーから除外する（番地レベルまで）', () => {
    expect(normalizeAddress('東京都豊島区巣鴨1-15-1 宮田ビルB1・B2F')).toBe('東京都豊島区巣鴨1-15-1')
    expect(normalizeAddress('東京都千代田区外神田1-10-5 廣瀬本社ビル')).toBe('東京都千代田区外神田1-10-5')
  })

  it('表記揺れ（全角＋丁目＋建物名）が同一キーへ収束する', () => {
    const a = normalizeAddress('東京都新宿区新宿３丁目２２－１２ 高層ビル5F')
    const b = normalizeAddress('東京都新宿区新宿3-22-12')
    expect(a).toBe(b)
  })

  it('前後・連続空白を除去する', () => {
    expect(normalizeAddress('　東京都新宿区新宿3-22-12　')).toBe('東京都新宿区新宿3-22-12')
  })
})

// ---------------------------------------------------------------------------
// deriveId（Req2.4）
// ---------------------------------------------------------------------------

describe('deriveId', () => {
  it('同一キーからは同一IDを決定論的に導出する', () => {
    expect(deriveId('東京都新宿区新宿3-22-12')).toBe(deriveId('東京都新宿区新宿3-22-12'))
  })

  it('異なるキーからは異なるIDを導出する', () => {
    expect(deriveId('東京都新宿区新宿3-22-12')).not.toBe(deriveId('東京都新宿区新宿3-22-13'))
  })
})

// ---------------------------------------------------------------------------
// mergeStores（Req2.3, 2.4, 2.6）
// ---------------------------------------------------------------------------

describe('mergeStores', () => {
  const allAreas = bothSites(['JP-13'])

  it('両サイト掲載の同一店舗を1件へ統合しゲームを合成する', () => {
    const result = mergeStores({
      raw: [
        raw({ site: 'jojols', name: '新宿スポーツランド本館', address: '東京都新宿区新宿3-22-12' }),
        raw({ site: 'gundam', name: '新宿スポーツランド本館', address: '東京都新宿区新宿3-22-12' }),
      ],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].games).toEqual(['jojo-ls', 'gundam-exvs'])
  })

  it('建物名の差は統合キーに影響しない（同一番地・同一店舗名は統合）', () => {
    const result = mergeStores({
      raw: [
        raw({ site: 'jojols', name: 'GiGO総本店', address: '東京都豊島区東池袋1-13-6' }),
        raw({ site: 'gundam', name: 'GiGO総本店', address: '東京都豊島区東池袋1-13-6 GiGOビル7F' }),
      ],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].games).toEqual(['jojo-ls', 'gundam-exvs'])
  })

  it('同一番地でも別店舗名は別キー（別店舗）として扱う', () => {
    const result = mergeStores({
      raw: [
        raw({ site: 'jojols', name: 'GiGO池袋', address: '東京都豊島区東池袋1-13-6' }),
        raw({ site: 'jojols', name: 'タイトー池袋', address: '東京都豊島区東池袋1-13-6' }),
      ],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(2)
    expect(new Set(result.map((s) => s.id)).size).toBe(2)
  })

  it('単一サイト掲載店は当該ゲームのみを持つ', () => {
    const result = mergeStores({
      raw: [raw({ site: 'gundam', name: 'シルクハット秋葉原', address: '東京都千代田区外神田1-10-9' })],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].games).toEqual(['gundam-exvs'])
  })

  it('再実行でIDが不変（出力をprevへ再投入しても同一ID）', () => {
    const input = {
      raw: [
        raw({ site: 'jojols', name: '新宿スポーツランド本館', address: '東京都新宿区新宿3-22-12' }),
        raw({ site: 'gundam', name: '新宿スポーツランド本館', address: '東京都新宿区新宿3-22-12' }),
      ],
      prev: [] as Store[],
      scrapedAreas: allAreas,
    }
    const first = mergeStores(input)
    const second = mergeStores({ ...input, prev: asPrev(first) })

    expect(second.map((s) => s.id)).toEqual(first.map((s) => s.id))
  })

  it('正常取得エリアで前回店舗が消失した場合は移設フラグを付与して保持する', () => {
    const prev: Store[] = [
      {
        id: 'x',
        name: '閉鎖済アミューズ',
        address: '東京都新宿区西新宿1-1-1',
        lat: 35.6,
        lng: 139.7,
        games: ['gundam-exvs'],
      },
    ]
    const result = mergeStores({ raw: [], prev, scrapedAreas: bothSites(['JP-13']) })

    expect(result).toHaveLength(1)
    expect(result[0].delisted).toBe(true)
    // 表示用の前回値（座標・名称）を維持する
    expect(result[0].lat).toBe(35.6)
    expect(result[0].name).toBe('閉鎖済アミューズ')
  })

  it('取得失敗エリアの前回店舗は移設判定せず前回状態を維持する', () => {
    const prev: Store[] = [
      {
        id: 'y',
        name: '大阪のゲーセン',
        address: '大阪府大阪市北区角田町1-1',
        lat: 34.7,
        lng: 135.5,
        games: ['jojo-ls'],
      },
    ]
    // 大阪（JP-27）は今回スクレイプ失敗 → scrapedAreas に含めない
    const result = mergeStores({ raw: [], prev, scrapedAreas: bothSites(['JP-13']) })

    expect(result).toHaveLength(1)
    expect(result[0].delisted).toBeUndefined()
  })

  it('再掲載された前回移設店舗は移設フラグが解除される', () => {
    const prev: Store[] = [
      {
        id: 'z',
        name: '復活ゲーセン',
        address: '東京都新宿区新宿3-22-12',
        lat: 35.69,
        lng: 139.7,
        games: ['jojo-ls'],
        delisted: true,
      },
    ]
    const result = mergeStores({
      raw: [raw({ site: 'jojols', name: '復活ゲーセン', address: '東京都新宿区新宿3-22-12' })],
      prev,
      scrapedAreas: bothSites(['JP-13']),
    })

    expect(result).toHaveLength(1)
    expect(result[0].delisted).toBeUndefined()
  })

  it('単一サイト掲載店は当該ゲームの台数のみを持つ', () => {
    const result = mergeStores({
      raw: [
        raw({ site: 'jojols', name: 'namco池袋', address: '東京都豊島区東池袋1-22-10', machineCount: 10 }),
      ],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].machineCounts).toEqual({ 'jojo-ls': 10 })
  })

  it('両サイト掲載店はゲーム別台数を正準順序で合成する', () => {
    const result = mergeStores({
      raw: [
        // あえて gundam を先に投入し、出力が GAME_ORDER 順（jojo-ls→gundam-exvs）になることを確認
        raw({ site: 'gundam', name: '新宿スポーツランド本館', address: '東京都新宿区新宿3-22-12', machineCount: 4 }),
        raw({ site: 'jojols', name: '新宿スポーツランド本館', address: '東京都新宿区新宿3-22-12', machineCount: 6 }),
      ],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].machineCounts).toEqual({ 'jojo-ls': 6, 'gundam-exvs': 4 })
    // キー順が GAME_ORDER（jojo-ls が先）に整列していることを確認
    expect(Object.keys(result[0].machineCounts!)).toEqual(['jojo-ls', 'gundam-exvs'])
  })

  it('台数不明（0）のタイトルは machineCounts から省略する', () => {
    const result = mergeStores({
      raw: [
        raw({ site: 'jojols', name: '台数不明店', address: '東京都新宿区新宿3-22-12', machineCount: 0 }),
        raw({ site: 'gundam', name: '台数不明店', address: '東京都新宿区新宿3-22-12', machineCount: 3 }),
      ],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].machineCounts).toEqual({ 'gundam-exvs': 3 })
  })

  it('両サイトとも台数不明（0）なら machineCounts を付与しない', () => {
    const result = mergeStores({
      raw: [raw({ site: 'jojols', name: '台数なし', address: '東京都新宿区新宿3-22-12', machineCount: 0 })],
      prev: [],
      scrapedAreas: allAreas,
    })

    expect(result).toHaveLength(1)
    expect(result[0].machineCounts).toBeUndefined()
  })

  it('今回スクレイプに無い前回店舗（移設）は前回の台数を引き継ぐ', () => {
    const prev: Store[] = [
      {
        id: 'm',
        name: '移設候補店',
        address: '東京都新宿区西新宿1-1-1',
        lat: 35.6,
        lng: 139.7,
        games: ['jojo-ls', 'gundam-exvs'],
        machineCounts: { 'jojo-ls': 2, 'gundam-exvs': 5 },
      },
    ]
    const result = mergeStores({ raw: [], prev, scrapedAreas: bothSites(['JP-13']) })

    expect(result).toHaveLength(1)
    expect(result[0].delisted).toBe(true)
    expect(result[0].machineCounts).toEqual({ 'jojo-ls': 2, 'gundam-exvs': 5 })
  })

  it('手動の閉店フラグ（closed）はパイプラインで変更されない', () => {
    const prev: Store[] = [
      {
        id: 'c',
        name: '閉店店舗',
        address: '東京都新宿区新宿3-22-12',
        lat: 35.69,
        lng: 139.7,
        games: ['jojo-ls', 'gundam-exvs'],
        closed: true,
      },
    ]
    // 今回も公式一覧に存在する
    const result = mergeStores({
      raw: [raw({ site: 'jojols', name: '閉店店舗', address: '東京都新宿区新宿3-22-12' })],
      prev,
      scrapedAreas: bothSites(['JP-13']),
    })

    expect(result).toHaveLength(1)
    expect(result[0].closed).toBe(true)
  })
  describe('片方のサイトだけ取得できた場合（ADR-0008）', () => {
    const both: Store = {
      id: 'b',
      name: '両対応店',
      address: '東京都新宿区新宿3-22-12',
      lat: 35.69,
      lng: 139.7,
      games: ['jojo-ls', 'gundam-exvs'],
      machineCounts: { 'jojo-ls': 6, 'gundam-exvs': 4 },
    }

    it('両対応店がラスサバに掲載・イニブ未取得なら、イニブのゲームと台数を前回から引き継ぐ', () => {
      const result = mergeStores({
        raw: [raw({ site: 'jojols', name: '両対応店', address: '東京都新宿区新宿3-22-12', machineCount: 8 })],
        prev: [both],
        scrapedAreas: onlySite('jojols', ['JP-13']),
      })

      expect(result).toHaveLength(1)
      expect(result[0].games).toEqual(['jojo-ls', 'gundam-exvs'])
      // ラスサバは今回の台数、イニブは前回の台数
      expect(result[0].machineCounts).toEqual({ 'jojo-ls': 8, 'gundam-exvs': 4 })
      expect(Object.keys(result[0].machineCounts!)).toEqual(['jojo-ls', 'gundam-exvs'])
      expect(result[0].delisted).toBeUndefined()
    })

    it('両サイト取得済みでイニブから消えた両対応店は、従来どおりラスサバだけになる', () => {
      const result = mergeStores({
        raw: [raw({ site: 'jojols', name: '両対応店', address: '東京都新宿区新宿3-22-12', machineCount: 6 })],
        prev: [both],
        scrapedAreas: bothSites(['JP-13']),
      })

      expect(result[0].games).toEqual(['jojo-ls'])
      expect(result[0].machineCounts).toEqual({ 'jojo-ls': 6 })
    })

    it('ラスサバから消えた両対応店は、イニブ未取得ならイニブだけで掲載を続ける', () => {
      const result = mergeStores({
        raw: [],
        prev: [both],
        scrapedAreas: onlySite('jojols', ['JP-13']),
      })

      expect(result).toHaveLength(1)
      expect(result[0].games).toEqual(['gundam-exvs'])
      expect(result[0].machineCounts).toEqual({ 'gundam-exvs': 4 })
      expect(result[0].delisted).toBeUndefined()
      // ID は前回と同じ統合キーから採番される
      expect(result[0].id).toBe(deriveId('東京都新宿区新宿3-22-12|両対応店'))
    })

    it('ラスサバだけの店がラスサバから消えたら、イニブ未取得でも移設判定する', () => {
      const result = mergeStores({
        raw: [],
        prev: [{ ...both, games: ['jojo-ls'], machineCounts: { 'jojo-ls': 6 } }],
        scrapedAreas: onlySite('jojols', ['JP-13']),
      })

      expect(result[0].delisted).toBe(true)
      expect(result[0].games).toEqual(['jojo-ls'])
    })

    it('イニブだけの店は、イニブ未取得なら前回の状態を維持する', () => {
      const result = mergeStores({
        raw: [],
        prev: [{ ...both, games: ['gundam-exvs'], machineCounts: { 'gundam-exvs': 4 } }],
        scrapedAreas: onlySite('jojols', ['JP-13']),
      })

      expect(result[0].delisted).toBeUndefined()
      expect(result[0].games).toEqual(['gundam-exvs'])
      expect(result[0].machineCounts).toEqual({ 'gundam-exvs': 4 })
    })

    it('前回すでに移設判定済みの店は、未取得サイトがあっても移設のまま', () => {
      const result = mergeStores({
        raw: [],
        prev: [{ ...both, delisted: true }],
        scrapedAreas: onlySite('jojols', ['JP-13']),
      })

      expect(result[0].delisted).toBe(true)
      expect(result[0].games).toEqual(['jojo-ls', 'gundam-exvs'])
    })
  })
})
