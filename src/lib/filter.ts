import type { Store, FilterOption } from '@/types/store'

export function filterStores(stores: Store[], filter: FilterOption): Store[] {
  if (filter === 'all') return stores
  return stores.filter((store) => store.games.includes(filter))
}
