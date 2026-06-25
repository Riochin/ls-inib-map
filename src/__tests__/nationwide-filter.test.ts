import { describe, it, expect } from 'vitest'
import { parseAddress, buildAddressIndex } from '@/lib/address-parser'
import { filterStoresByAddress } from '@/lib/filter'
import type { Store, AddressFilter } from '@/types/store'

/**
 * タスク5.2: 全国住所での既存フィルタ/住所パース回帰テスト。
 * 関東限定から全国化（Req3）した際、各地方の都道府県・市区町村・政令市・郡町村・
 * 23区が住所パースと階層フィルタで正しく扱われることを固定する。
 */

// 全国の代表サンプル（北海道〜九州・沖縄、政令市/郡町村/23区を網羅）
const SAMPLE: ReadonlyArray<{
  raw: string
  prefecture: string
  city: string | null
  ward: string | null
}> = [
  { raw: '北海道札幌市中央区南3条', prefecture: '北海道', city: '札幌市', ward: '中央区' },
  { raw: '宮城県仙台市青葉区中央1-1', prefecture: '宮城県', city: '仙台市', ward: '青葉区' },
  { raw: '東京都新宿区新宿3-22-12', prefecture: '東京都', city: null, ward: '新宿区' },
  { raw: '東京都西多摩郡日の出町平井235', prefecture: '東京都', city: '西多摩郡日の出町', ward: null },
  { raw: '神奈川県横浜市西区南幸1-1', prefecture: '神奈川県', city: '横浜市', ward: '西区' },
  { raw: '愛知県名古屋市中区栄3-1', prefecture: '愛知県', city: '名古屋市', ward: '中区' },
  { raw: '大阪府大阪市北区梅田1-1', prefecture: '大阪府', city: '大阪市', ward: '北区' },
  { raw: '京都府京都市下京区四条', prefecture: '京都府', city: '京都市', ward: '下京区' },
  { raw: '広島県広島市中区基町1', prefecture: '広島県', city: '広島市', ward: '中区' },
  { raw: '福岡県福岡市博多区博多駅前2', prefecture: '福岡県', city: '福岡市', ward: '博多区' },
  { raw: '沖縄県那覇市おもろまち1-1', prefecture: '沖縄県', city: '那覇市', ward: null },
  { raw: '香川県高松市番町1-1', prefecture: '香川県', city: '高松市', ward: null },
]

describe('全国住所の住所パース回帰', () => {
  it.each(SAMPLE)('「$raw」を pref=$prefecture / city=$city / ward=$ward にパースする', (s) => {
    expect(parseAddress(s.raw)).toEqual({
      prefecture: s.prefecture,
      city: s.city,
      ward: s.ward,
    })
  })
})

describe('全国住所の階層フィルタ回帰', () => {
  const stores: Store[] = SAMPLE.map((s, i) => ({
    id: `s-${i}`,
    name: `店舗${i}`,
    address: s.raw,
    lat: 35,
    lng: 139,
    games: ['jojo-ls'],
  }))
  const index = buildAddressIndex(stores)

  it('都道府県で絞り込むと当該県の店舗のみ残る', () => {
    const filter: AddressFilter = { region: null, prefectures: ['東京都'], cities: [], wards: [] }
    const result = filterStoresByAddress(stores, filter, index)
    expect(result).toHaveLength(2) // 新宿区 + 西多摩郡日の出町
    expect(result.every((r) => r.address.startsWith('東京都'))).toBe(true)
  })

  it('政令市＋区で絞り込むと当該区の店舗のみ残る', () => {
    const filter: AddressFilter = {
      region: null,
      prefectures: ['神奈川県'],
      cities: ['横浜市'],
      wards: ['西区'],
    }
    const result = filterStoresByAddress(stores, filter, index)
    expect(result).toHaveLength(1)
    expect(result[0].address).toContain('横浜市西区')
  })

  it('東京23区は ward を市区キーとして絞り込める', () => {
    const filter: AddressFilter = {
      region: null,
      prefectures: ['東京都'],
      cities: ['新宿区'],
      wards: [],
    }
    const result = filterStoresByAddress(stores, filter, index)
    expect(result).toHaveLength(1)
    expect(result[0].address).toContain('新宿区')
  })

  it('郡＋町村は単一の市区キーとして扱われる', () => {
    const index2 = buildAddressIndex(stores)
    expect(index2.prefectureCities.get('東京都')).toContain('西多摩郡日の出町')
  })

  it('政令市の区一覧がインデックスに登録される', () => {
    expect(index.cityWards.get('神奈川県|横浜市')).toEqual(['西区'])
    expect(index.cityWards.get('北海道|札幌市')).toEqual(['中央区'])
  })
})
