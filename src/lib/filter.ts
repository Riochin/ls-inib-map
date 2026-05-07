import type { Store, FilterOption, AddressFilter, AddressIndex } from '@/types/store'

export function filterStores(stores: Store[], filter: FilterOption): Store[] {
  if (filter === 'all') return stores
  return stores.filter((store) => store.games.includes(filter))
}

export function filterStoresByAddress(
  stores: Store[],
  filter: AddressFilter,
  index: AddressIndex,
): Store[] {
  if (!filter.prefecture && filter.cities.length === 0) return stores
  return stores.filter((store) => {
    const parsed = index.storeAddresses.get(store.id)
    if (!parsed) return false
    if (filter.prefecture && parsed.prefecture !== filter.prefecture) return false
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
