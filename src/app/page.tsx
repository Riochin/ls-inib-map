'use client'

import { useState, useCallback, useMemo } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { stores } from '@/data/stores'
import { filterStores } from '@/lib/filter'
import { MapView } from '@/components/MapView'
import { FilterBar } from '@/components/FilterBar'
import type { FilterOption } from '@/types/store'

export default function MapPage() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setActiveFilter(filter)
  }, [])

  const filteredStores = useMemo(
    () => filterStores(stores, activeFilter),
    [activeFilter]
  )

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      <div className="relative w-full h-dvh">
        <FilterBar activeFilter={activeFilter} onFilterChange={handleFilterChange} />
        <MapView stores={filteredStores} />
      </div>
    </APIProvider>
  )
}
