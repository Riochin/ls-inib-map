import { describe, it, expect } from 'vitest'
import { filterStoresByAddress, filterStoresAll, isStoreFilterActive } from '@/lib/filter'
import { buildAddressIndex } from '@/lib/address-parser'
import { EMPTY_ADDRESS_FILTER, EMPTY_STORE_FILTER } from '@/types/store'
import type { Store, AddressFilter, StoreFilter } from '@/types/store'

const mockStores: Store[] = [
  { id: 't1', name: '新宿A', address: '東京都新宿区新宿3-1', lat: 0, lng: 0, games: ['jojo-ls', 'gundam-exvs'] },
  { id: 't2', name: '豊島B', address: '東京都豊島区東池袋1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
  { id: 't3', name: '町田C', address: '東京都町田市森野1-1', lat: 0, lng: 0, games: ['gundam-exvs'] },
  { id: 'k1', name: '横浜D', address: '神奈川県横浜市西区南幸1-1', lat: 0, lng: 0, games: ['jojo-ls', 'gundam-exvs'] },
  { id: 'k2', name: '横浜E', address: '神奈川県横浜市中区山下町1', lat: 0, lng: 0, games: ['jojo-ls'] },
  { id: 'k3', name: '厚木F', address: '神奈川県厚木市中町3-1', lat: 0, lng: 0, games: ['gundam-exvs'] },
  { id: 's1', name: 'さいたまG', address: '埼玉県さいたま市大宮区大門町1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
]

const index = buildAddressIndex(mockStores)

describe('filterStoresByAddress', () => {
  it('フィルター未設定なら全店舗を返す', () => {
    expect(filterStoresByAddress(mockStores, EMPTY_ADDRESS_FILTER, index)).toHaveLength(mockStores.length)
  })

  it('都県フィルターで絞り込む', () => {
    const filter: AddressFilter = { region: null, prefectures: ['東京都'], cities: [], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    expect(result).toHaveLength(3)
    result.forEach((s) => expect(['t1', 't2', 't3']).toContain(s.id))
  })

  it('都県+市区フィルターで絞り込む', () => {
    const filter: AddressFilter = { region: null, prefectures: ['東京都'], cities: ['新宿区'], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t1')
  })

  it('複数市区を選択する（OR）', () => {
    const filter: AddressFilter = { region: null, prefectures: ['東京都'], cities: ['新宿区', '豊島区'], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    expect(result).toHaveLength(2)
  })

  it('政令指定都市で区まで絞り込む', () => {
    const filter: AddressFilter = { region: null, prefectures: ['神奈川県'], cities: ['横浜市'], wards: ['西区'] }
    const result = filterStoresByAddress(mockStores, filter, index)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('k1')
  })

  it('政令指定都市の区未選択なら市内すべて', () => {
    const filter: AddressFilter = { region: null, prefectures: ['神奈川県'], cities: ['横浜市'], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id)).toContain('k1')
    expect(result.map((s) => s.id)).toContain('k2')
  })

  it('複数都県を選択すると OR で絞り込む（東京＋神奈川）', () => {
    const filter: AddressFilter = { region: null, prefectures: ['東京都', '神奈川県'], cities: [], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    // 東京3 + 神奈川3 = 6（埼玉s1は除外）
    expect(result).toHaveLength(6)
    expect(result.map((s) => s.id)).not.toContain('s1')
  })

  it('地方フィルターのみで関東の店舗を絞り込む', () => {
    const filter: AddressFilter = { region: '関東', prefectures: [], cities: [], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    // 東京3 + 神奈川3 + 埼玉1 = 7（全件が関東）
    expect(result).toHaveLength(7)
  })

  it('地方フィルターで地方外（近畿など）の店舗を除外する', () => {
    const withKinki: Store[] = [
      ...mockStores,
      { id: 'o1', name: '大阪H', address: '大阪府大阪市北区梅田1-1', lat: 0, lng: 0, games: ['gundam-exvs'] },
    ]
    const idx = buildAddressIndex(withKinki)
    const filter: AddressFilter = { region: '関東', prefectures: [], cities: [], wards: [] }
    const result = filterStoresByAddress(withKinki, filter, idx)
    expect(result.map((s) => s.id)).not.toContain('o1')
    expect(result).toHaveLength(7)
  })

  it('地方＋都県が両方指定なら都県が優先（より狭い側）', () => {
    const filter: AddressFilter = { region: '関東', prefectures: ['東京都'], cities: [], wards: [] }
    const result = filterStoresByAddress(mockStores, filter, index)
    expect(result).toHaveLength(3)
    result.forEach((s) => expect(['t1', 't2', 't3']).toContain(s.id))
  })
})

describe('filterStoresAll', () => {
  it('ゲームフィルターと住所フィルターのAND', () => {
    const addressFilter: AddressFilter = { region: null, prefectures: ['東京都'], cities: [], wards: [] }
    const result = filterStoresAll(mockStores, 'jojo-ls', addressFilter, index)
    // 東京都 かつ jojo-ls: t1, t2
    expect(result).toHaveLength(2)
    result.forEach((s) => expect(['t1', 't2']).toContain(s.id))
  })

  it('両フィルター未設定なら全店舗を返す', () => {
    expect(filterStoresAll(mockStores, 'all', EMPTY_ADDRESS_FILTER, index)).toHaveLength(mockStores.length)
  })
})

describe('isStoreFilterActive', () => {
  it('空フィルターは false', () => {
    expect(isStoreFilterActive(EMPTY_STORE_FILTER)).toBe(false)
  })

  it('地方のみ選択でも true', () => {
    const f: StoreFilter = { ...EMPTY_STORE_FILTER, address: { ...EMPTY_ADDRESS_FILTER, region: '関東' } }
    expect(isStoreFilterActive(f)).toBe(true)
  })

  it('都県選択で true', () => {
    const f: StoreFilter = { ...EMPTY_STORE_FILTER, address: { ...EMPTY_ADDRESS_FILTER, prefectures: ['東京都'] } }
    expect(isStoreFilterActive(f)).toBe(true)
  })

  it('設備条件（営業中）で true', () => {
    const f: StoreFilter = { ...EMPTY_STORE_FILTER, facility: { ...EMPTY_STORE_FILTER.facility, openOnly: true } }
    expect(isStoreFilterActive(f)).toBe(true)
  })

  it('最低台数指定で true', () => {
    const f: StoreFilter = { ...EMPTY_STORE_FILTER, facility: { ...EMPTY_STORE_FILTER.facility, minMachines: 2 } }
    expect(isStoreFilterActive(f)).toBe(true)
  })

  it('充実度フィルターで true', () => {
    const f: StoreFilter = { ...EMPTY_STORE_FILTER, completeness: 'poor' }
    expect(isStoreFilterActive(f)).toBe(true)
  })
})
