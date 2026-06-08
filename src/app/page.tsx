'use client'

import { useState, useCallback, useMemo } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { stores } from '@/data/stores'
import { filterStoresAll, filterStoresByKeyword } from '@/lib/filter'
import { buildAddressIndex } from '@/lib/address-parser'
import { useGeolocation } from '@/hooks/use-geolocation'
import { MapView } from '@/components/MapView'
import { FilterBar } from '@/components/FilterBar'
import { LocateButton } from '@/components/LocateButton'
import { AddressFilterButton } from '@/components/AddressFilterButton'
import { AddressFilterModal } from '@/components/AddressFilterModal'
import { SearchButton } from '@/components/SearchButton'
import { SearchBar } from '@/components/SearchBar'
import { StoreCount } from '@/components/StoreCount'
import { LastUpdated } from '@/components/LastUpdated'
import { Credit } from '@/components/Credit'
import { Onboarding } from '@/components/Onboarding'
import type { FilterOption, AddressFilter, Store } from '@/types/store'
import type { StoresMeta } from '@/types/stores-file'
import { EMPTY_ADDRESS_FILTER } from '@/types/store'

// メタ情報（最終更新日時・出典・公式総数）は生成物 stores.json から供給される（タスク5でローダ配線）。
// 未生成の現状は null とし、件数/更新日時表示はグレースフルにデグレードする。
const storesMeta: StoresMeta | null = null

export default function MapPage() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [addressFilter, setAddressFilter] = useState<AddressFilter>(EMPTY_ADDRESS_FILTER)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [focusStore, setFocusStore] = useState<Store | null>(null)
  const { location, isLocating, error, locate } = useGeolocation()

  const addressIndex = useMemo(() => buildAddressIndex(stores), [])

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter)
  }, [])

  const filteredStores = useMemo(
    () => filterStoresByKeyword(
      filterStoresAll(stores, activeFilter, addressFilter, addressIndex),
      searchQuery,
    ),
    [activeFilter, addressFilter, addressIndex, searchQuery],
  )

  const isAddressFilterActive =
    addressFilter.prefecture !== null || addressFilter.cities.length > 0

  const isFiltered =
    activeFilter !== 'all' || isAddressFilterActive || searchQuery.trim() !== ''

  const handleSearchSelect = useCallback((store: Store) => {
    setFocusStore(store)
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  const handleMapClick = useCallback(() => {
    setIsSearchOpen(false)
  }, [])

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      <div className="relative w-full h-dvh">
        <FilterBar activeFilter={activeFilter} onFilterChange={handleFilterChange} />
        {/* 件数・最終更新日時をコンパクトに集約（モバイル：左上）。メタ欠落時は更新日時を省略 */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-0.5 bg-white/85 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow">
          <StoreCount
            total={stores.length}
            filtered={filteredStores.length}
            isFiltered={isFiltered}
          />
          <LastUpdated lastUpdated={storesMeta?.lastUpdated} />
        </div>
        <SearchButton
          isActive={isSearchOpen}
          onToggle={() => setIsSearchOpen((prev) => !prev)}
        />
        {isSearchOpen && (
          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            onSelect={handleSearchSelect}
            results={filteredStores}
            onClose={() => { setIsSearchOpen(false); setSearchQuery('') }}
          />
        )}
        <AddressFilterButton
          isActive={isAddressFilterActive}
          onOpen={() => setIsAddressModalOpen(true)}
        />
        <MapView
          stores={filteredStores}
          userLocation={location}
          focusStore={focusStore}
          onFocusConsumed={() => setFocusStore(null)}
          onMapClick={handleMapClick}
        />
        <LocateButton isLocating={isLocating} error={error} onLocate={locate} />
        <Credit source={storesMeta?.source} />
        <Onboarding />
        {isAddressModalOpen && (
          <AddressFilterModal
            index={addressIndex}
            activeFilter={addressFilter}
            onApply={setAddressFilter}
            onClose={() => setIsAddressModalOpen(false)}
          />
        )}
      </div>
    </APIProvider>
  )
}
