'use client'

import { useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { stores, storesMeta } from '@/data/stores'
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
import { PairSchedulePanel } from '@/components/PairSchedulePanel'
import type { FilterOption, AddressFilter, Store } from '@/types/store'
import { EMPTY_ADDRESS_FILTER } from '@/types/store'
import { loadSavedFilter, saveFilter } from '@/lib/filter-storage'

// SSR では useLayoutEffect が警告を出すため useEffect にフォールバックする。
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function MapPage() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [addressFilter, setAddressFilter] = useState<AddressFilter>(EMPTY_ADDRESS_FILTER)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [focusStore, setFocusStore] = useState<Store | null>(null)
  const { location, isLocating, error, locate } = useGeolocation()

  const addressIndex = useMemo(() => buildAddressIndex(stores), [])

  // 前回開いていたタブを復元（localStorage 不可環境では既定の「すべて」のまま）。
  // 初回ハイドレーションは SSR と同じ 'all' で一致させ、描画前に走る useLayoutEffect で
  // 保存タブへ差し替えることで、'すべて'→保存タブの一瞬のちらつき（FOUC）を防ぐ。
  useIsomorphicLayoutEffect(() => {
    const saved = loadSavedFilter()
    if (saved) setActiveFilter(saved)
  }, [])

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter)
    saveFilter(filter)
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
        {/* 件数・最終更新日時＋（ラスサバ時）ペア戦案内を左上に縦に集約。フィルタバー(中央)・
            検索(右上)と段をずらし、メタ欠落時は更新日時を省略。ペア戦案内は件数カードの下に
            重ならず並べ、同じ見た目・サイズで統一する */}
        <div className="absolute top-20 left-4 z-10 flex flex-col gap-2 items-start">
          <div className="flex flex-col gap-0.5 bg-white/85 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow">
            <StoreCount
              total={stores.length}
              filtered={filteredStores.length}
              isFiltered={isFiltered}
            />
            <LastUpdated lastUpdated={storesMeta?.lastUpdated} />
          </div>
          {/* ラスサバ選択中のみ、今日のペア戦/ソロ戦を折りたたみチップで表示（タップで日程展開） */}
          {activeFilter === 'jojo-ls' && <PairSchedulePanel />}
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
