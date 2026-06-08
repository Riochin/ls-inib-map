import type { Store, ParsedAddress, AddressIndex } from '@/types/store'
import { normalizeTextBasics } from '@/lib/text-normalize'

export function parseAddress(rawAddress: string): ParsedAddress {
  const address = normalizeTextBasics(rawAddress)
  const prefMatch = address.match(/^(.*?[都道府県])/)
  if (!prefMatch) return { prefecture: '', city: null, ward: null }

  const prefecture = prefMatch[1]
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
