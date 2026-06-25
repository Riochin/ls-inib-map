import type { Store, FilterOption, AddressFilter, AddressIndex, StoreFilter } from '@/types/store'
import { prefecturesOfRegion } from '@/lib/region'

export function filterStores(stores: Store[], filter: FilterOption): Store[] {
  if (filter === 'all') return stores
  return stores.filter((store) => store.games.includes(filter))
}

export function filterStoresByAddress(
  stores: Store[],
  filter: AddressFilter,
  index: AddressIndex,
): Store[] {
  if (!filter.region && filter.prefectures.length === 0 && filter.cities.length === 0) return stores
  // 地方のみ選択時（都県未選択）は所属都道府県の集合で OR 判定する。都県を選んだら都県が優先。
  const regionPrefs =
    filter.region && filter.prefectures.length === 0
      ? new Set(prefecturesOfRegion(filter.region))
      : null
  return stores.filter((store) => {
    const parsed = index.storeAddresses.get(store.id)
    if (!parsed) return false
    if (regionPrefs && !regionPrefs.has(parsed.prefecture)) return false
    if (filter.prefectures.length > 0 && !filter.prefectures.includes(parsed.prefecture)) return false
    if (filter.cities.length > 0) {
      const storeCity = parsed.city ?? parsed.ward
      if (!storeCity || !filter.cities.includes(storeCity)) return false
      if (filter.wards.length > 0 && parsed.ward) {
        if (!filter.wards.includes(parsed.ward)) return false
      }
    }
    return true
  })
}

export function filterStoresByKeyword(stores: Store[], query: string): Store[] {
  if (!query.trim()) return stores
  const tokens = query.trim().toLowerCase().split(/\s+/)
  return stores.filter((store) => {
    const target = (store.name + store.address).toLowerCase()
    return tokens.every((token) => target.includes(token))
  })
}

export function filterStoresAll(
  stores: Store[],
  gameFilter: FilterOption,
  addressFilter: AddressFilter,
  index: AddressIndex,
): Store[] {
  return filterStoresByAddress(filterStores(stores, gameFilter), addressFilter, index)
}

/**
 * 統合フィルタ（住所＋設備＋充実度）に何らかの絞り込みがかかっているか。
 * ゲームタイトルタブ（FilterOption）は別管理のためここでは判定しない。
 */
export function isStoreFilterActive(filter: StoreFilter): boolean {
  const { address, facility, completeness } = filter
  const addressActive =
    address.region !== null || address.prefectures.length > 0 || address.cities.length > 0
  const facilityActive =
    facility.minMachines !== null ||
    facility.hasStreaming ||
    facility.hasRecording ||
    facility.hasSmoking ||
    facility.openOnly
  return addressActive || facilityActive || completeness !== 'all'
}
