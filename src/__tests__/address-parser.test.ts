import { describe, it, expect } from 'vitest'
import { parseAddress, buildAddressIndex } from '@/lib/address-parser'
import type { Store } from '@/types/store'

describe('parseAddress', () => {
  it('東京23区 (パターンA)', () => {
    expect(parseAddress('東京都新宿区新宿3-22-12')).toEqual({
      prefecture: '東京都', city: null, ward: '新宿区',
    })
    expect(parseAddress('東京都豊島区東池袋1-13-6')).toEqual({
      prefecture: '東京都', city: null, ward: '豊島区',
    })
  })

  it('東京都市部 (パターンB)', () => {
    expect(parseAddress('東京都町田市森野1-13-14')).toEqual({
      prefecture: '東京都', city: '町田市', ward: null,
    })
    expect(parseAddress('東京都武蔵野市吉祥寺本町1-10-1 いなりやビルB1F')).toEqual({
      prefecture: '東京都', city: '武蔵野市', ward: null,
    })
  })

  it('東京都 郡+町村 (パターンE)', () => {
    expect(parseAddress('東京都西多摩郡日の出町平井字三吉野桜木237-3 イオンモール日の出3F')).toEqual({
      prefecture: '東京都', city: '西多摩郡日の出町', ward: null,
    })
  })

  it('政令指定都市+区 (パターンC)', () => {
    expect(parseAddress('神奈川県横浜市西区南幸1-12-9')).toEqual({
      prefecture: '神奈川県', city: '横浜市', ward: '西区',
    })
    expect(parseAddress('神奈川県川崎市川崎区駅前本町8')).toEqual({
      prefecture: '神奈川県', city: '川崎市', ward: '川崎区',
    })
    expect(parseAddress('埼玉県さいたま市大宮区大門町1-1')).toEqual({
      prefecture: '埼玉県', city: 'さいたま市', ward: '大宮区',
    })
  })

  it('一般市 (パターンD)', () => {
    expect(parseAddress('神奈川県厚木市中町3-4-22')).toEqual({
      prefecture: '神奈川県', city: '厚木市', ward: null,
    })
    expect(parseAddress('千葉県柏市柏2-3-1')).toEqual({
      prefecture: '千葉県', city: '柏市', ward: null,
    })
  })

  it('埼玉県 郡+町村', () => {
    expect(parseAddress('埼玉県児玉郡上里町金久保394-1')).toEqual({
      prefecture: '埼玉県', city: '児玉郡上里町', ward: null,
    })
  })
})

describe('buildAddressIndex', () => {
  const mockStores: Store[] = [
    { id: 's1', name: 'A', address: '東京都新宿区新宿3-1', lat: 0, lng: 0, games: ['jojo-ls'] },
    { id: 's2', name: 'B', address: '東京都町田市森野1-1', lat: 0, lng: 0, games: ['gundam-exvs'] },
    { id: 's3', name: 'C', address: '神奈川県横浜市西区南幸1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
    { id: 's4', name: 'D', address: '神奈川県横浜市中区山下町1', lat: 0, lng: 0, games: ['jojo-ls'] },
  ]

  it('storeAddressesにstore.idで参照できる', () => {
    const index = buildAddressIndex(mockStores)
    expect(index.storeAddresses.get('s1')).toEqual({ prefecture: '東京都', city: null, ward: '新宿区' })
    expect(index.storeAddresses.get('s3')).toEqual({ prefecture: '神奈川県', city: '横浜市', ward: '西区' })
  })

  it('prefectureCitiesに市区が登録される', () => {
    const index = buildAddressIndex(mockStores)
    const tokyoCities = index.prefectureCities.get('東京都')
    expect(tokyoCities).toContain('新宿区')
    expect(tokyoCities).toContain('町田市')

    const kanagawaCities = index.prefectureCities.get('神奈川県')
    expect(kanagawaCities).toContain('横浜市')
  })

  it('cityWardsに区一覧が登録される（政令指定都市）', () => {
    const index = buildAddressIndex(mockStores)
    const wards = index.cityWards.get('神奈川県|横浜市')
    expect(wards).toContain('西区')
    expect(wards).toContain('中区')
  })

  it('重複登録されない', () => {
    const dupeStores: Store[] = [
      { id: 'x1', name: 'X', address: '東京都新宿区新宿1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
      { id: 'x2', name: 'Y', address: '東京都新宿区西新宿1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
    ]
    const index = buildAddressIndex(dupeStores)
    const cities = index.prefectureCities.get('東京都') ?? []
    expect(cities.filter((c) => c === '新宿区').length).toBe(1)
  })
})
