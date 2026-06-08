import type { Store, ParsedAddress, AddressIndex } from '@/types/store'
import { normalizeTextBasics } from '@/lib/text-normalize'

/**
 * 47都道府県名（全国対応）。
 * 非貪欲な `[都道府県]` マッチでは「京都府」が「京都」に化けるため、
 * 既知の都道府県名を前方一致で照合して接頭辞を確定する。
 */
const PREFECTURES = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県',
] as const

export function parseAddress(rawAddress: string): ParsedAddress {
  const address = normalizeTextBasics(rawAddress)
  const prefecture = PREFECTURES.find((p) => address.startsWith(p))
  if (!prefecture) return { prefecture: '', city: null, ward: null }

  const rest = address.slice(prefecture.length)

  // 政令指定都市+区 (横浜市西区 etc.)
  const cityWardMatch = rest.match(/^([^\s]*?市)([^\s]*?区)/)
  if (cityWardMatch) {
    return { prefecture, city: cityWardMatch[1], ward: cityWardMatch[2] }
  }

  // 市のみ
  const cityMatch = rest.match(/^([^\s]*?市)/)
  if (cityMatch) {
    return { prefecture, city: cityMatch[1], ward: null }
  }

  // 郡+町村 (西多摩郡日の出町 etc.)
  const countyMatch = rest.match(/^([^\s]*?郡)([^\s]*?[町村])/)
  if (countyMatch) {
    return { prefecture, city: countyMatch[1] + countyMatch[2], ward: null }
  }

  // 区のみ (東京23区)
  const wardMatch = rest.match(/^([^\s]*?区)/)
  if (wardMatch) {
    return { prefecture, city: null, ward: wardMatch[1] }
  }

  return { prefecture, city: null, ward: null }
}

export function buildAddressIndex(stores: Store[]): AddressIndex {
  const prefectureCities = new Map<string, string[]>()
  const cityWards = new Map<string, string[]>()
  const storeAddresses = new Map<string, ParsedAddress>()

  for (const store of stores) {
    const parsed = parseAddress(store.address)
    storeAddresses.set(store.id, parsed)

    const { prefecture, city, ward } = parsed
    if (!prefecture) continue

    // 市区一覧: 東京23区はwardをcity扱いで登録
    const cityKey = city ?? ward
    if (cityKey) {
      const cities = prefectureCities.get(prefecture) ?? []
      if (!cities.includes(cityKey)) cities.push(cityKey)
      prefectureCities.set(prefecture, cities)
    }

    // 区一覧 (政令指定都市の場合)
    if (city && ward) {
      const key = `${prefecture}|${city}`
      const wards = cityWards.get(key) ?? []
      if (!wards.includes(ward)) wards.push(ward)
      cityWards.set(key, wards)
    }
  }

  // ソート
  for (const [key, list] of prefectureCities) {
    prefectureCities.set(key, list.sort((a, b) => a.localeCompare(b, 'ja')))
  }
  for (const [key, list] of cityWards) {
    cityWards.set(key, list.sort((a, b) => a.localeCompare(b, 'ja')))
  }

  return { prefectureCities, cityWards, storeAddresses }
}
