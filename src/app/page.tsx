'use client'

import { useState, useCallback, useMemo } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { stores } from '@/data/stores'
import { filterStoresAll } from '@/lib/filter'
import { buildAddressIndex } from '@/lib/address-parser'
import { useGeolocation } from '@/hooks/use-geolocation'
import { MapView } from '@/components/MapView'
import { FilterBar } from '@/components/FilterBar'
import { LocateButton } from '@/components/LocateButton'
import { AddressFilterButton } from '@/components/AddressFilterButton'
import { AddressFilterModal } from '@/components/AddressFilterModal'
import type { FilterOption, AddressFilter } from '@/types/store'
import { EMPTY_ADDRESS_FILTER } from '@/types/store'

export default function MapPage() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')
  const [addressFilter, setAddressFilter] = useState<AddressFilter>(EMPTY_ADDRESS_FILTER)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const { location, isLocating, error, locate } = useGeolocation()

  const addressIndex = useMemo(() => buildAddressIndex(stores), [])

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter)
  }, [])

  const filteredStores = useMemo(
    () => filterStoresAll(stores, activeFilter, addressFilter, addressIndex),
    [activeFilter, addressFilter, addressIndex],
  )

  const isAddressFilterActive =
    addressFilter.prefecture !== null || addressFilter.cities.length > 0

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      <div className="relative w-full h-dvh">
        <FilterBar activeFilter={activeFilter} onFilterChange={handleFilterChange} />
        <AddressFilterButton
          isActive={isAddressFilterActive}
          onOpen={() => setIsAddressModalOpen(true)}
        />
        <MapView stores={filteredStores} userLocation={location} />
        <LocateButton isLocating={isLocating} error={error} onLocate={locate} />
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
