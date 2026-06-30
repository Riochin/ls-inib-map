'use client'

import { useState, useCallback, useMemo } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { stores, storesMeta } from '@/data/stores'
import { filterStoresAll, filterStoresByKeyword, isStoreFilterActive } from '@/lib/filter'
import { filterStoresByFacility } from '@/lib/facility-filter'
import { filterStoresByCompleteness } from '@/lib/completeness'
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
import type { FilterOption, StoreFilter, Store } from '@/types/store'
import { EMPTY_STORE_FILTER } from '@/types/store'
import {
  loadSavedFilter,
  saveFilter,
  loadSavedStoreFilter,
  saveStoreFilter,
  parseFilterFromSearch,
  buildFilterQueryUrl,
} from '@/lib/filter-storage'
import { useIsomorphicLayoutEffect } from '@/hooks/use-isomorphic-layout-effect'
import { usePwaLaunchTracking } from '@/hooks/use-pwa-launch-tracking'
import { trackEvent } from '@/lib/analytics'

export default function MapPage() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [storeFilter, setStoreFilter] = useState<StoreFilter>(EMPTY_STORE_FILTER)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [focusStore, setFocusStore] = useState<Store | null>(null)
  const { location, isLocating, error, locate } = useGeolocation()

  usePwaLaunchTracking()

  const addressIndex = useMemo(() => buildAddressIndex(stores), [])

  // 開くタブを復元する。URL（?game=、共有/ブックマーク用）を localStorage（前回の選択）より
  // 優先する。どちらも無ければ既定の「すべて」のまま。初回ハイドレーションは SSR と同じ
  // 'all' で一致させ、描画前に走る useLayoutEffect で差し替えることで FOUC を防ぐ。
  useIsomorphicLayoutEffect(() => {
    const fromUrl = parseFilterFromSearch(window.location.search)
    if (fromUrl) {
      setActiveFilter(fromUrl)
      return
    }
    const saved = loadSavedFilter()
    if (saved) setActiveFilter(saved)
  }, [])

  // 前回の絞り込み条件（地方/都県/設備/充実度）を復元。破損・未保存時は既定の空フィルタのまま。
  useIsomorphicLayoutEffect(() => {
    const saved = loadSavedStoreFilter()
    if (saved) setStoreFilter(saved)
  }, [])

  useIsomorphicLayoutEffect(() => {
    const id = new URLSearchParams(window.location.search).get('store')
    if (!id) return
    const found = stores.find((s) => s.id === id)
    if (found) setFocusStore(found)
  }, [])

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter)
    saveFilter(filter)
    // タブ切替を URL に反映する（共有・ブックマーク用）。履歴は積まない
    // （pushState だと「戻る」で他の操作と混ざり挙動が読みにくくなるため）。
    window.history.replaceState(null, '', buildFilterQueryUrl(window.location.href, filter))
    trackEvent('filter_title', { filter })
  }, [])

  const handleApplyStoreFilter = useCallback((filter: StoreFilter) => {
    setStoreFilter(filter)
    saveStoreFilter(filter)
  }, [])

  // モーダル内のリアルタイム件数。適用前のドラフト条件を本番と同じパイプラインで数える
  // （ゲームタブ・キーワードも込み）。
  const previewCount = useCallback(
    (draft: StoreFilter, game: FilterOption) => {
      const byAddress = filterStoresAll(stores, game, draft.address, addressIndex)
      const byFacility = filterStoresByFacility(byAddress, draft.facility, game)
      const byCompleteness = filterStoresByCompleteness(byFacility, draft.completeness)
      return filterStoresByKeyword(byCompleteness, searchQuery).length
    },
    [addressIndex, searchQuery],
  )

  const filteredStores = useMemo(() => {
    const byAddress = filterStoresAll(stores, activeFilter, storeFilter.address, addressIndex)
    const byFacility = filterStoresByFacility(byAddress, storeFilter.facility, activeFilter)
    const byCompleteness = filterStoresByCompleteness(byFacility, storeFilter.completeness)
    return filterStoresByKeyword(byCompleteness, searchQuery)
  }, [activeFilter, storeFilter, addressIndex, searchQuery])

  const isStoreFilterOn = isStoreFilterActive(storeFilter)

  const isFiltered =
    activeFilter !== 'all' || isStoreFilterOn || searchQuery.trim() !== ''

  const handleSearchSelect = useCallback((store: Store) => {
    setFocusStore(store)
    setIsSearchOpen(false)
    setSearchQuery('')
    trackEvent('select_search_result', { store_id: store.id })
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
          isActive={isStoreFilterOn}
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
            filter={storeFilter}
            gameFilter={activeFilter}
            onApply={handleApplyStoreFilter}
            onGameFilterChange={handleFilterChange}
            onClose={() => setIsAddressModalOpen(false)}
            previewCount={previewCount}
          />
        )}
      </div>
    </APIProvider>
  )
}
