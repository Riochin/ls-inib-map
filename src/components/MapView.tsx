'use client'

import { useState, useCallback } from 'react'
import { Map } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'
import { StoreMarker } from './StoreMarker'

interface MapViewProps {
  stores: Store[]
}

const DEFAULT_CENTER = { lat: 35.68, lng: 139.77 }
const DEFAULT_ZOOM = 10

export function MapView({ stores }: MapViewProps) {
  const [openStoreId, setOpenStoreId] = useState<string | null>(null)

  const handleOpen = useCallback((storeId: string) => {
    setOpenStoreId(storeId)
  }, [])

  const handleClose = useCallback(() => {
    setOpenStoreId(null)
  }, [])

  return (
    <Map
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      gestureHandling="greedy"
      disableDefaultUI
      zoomControl
      style={{ width: '100%', height: '100%' }}
    >
      {stores.map((store) => (
        <StoreMarker
          key={store.id}
          store={store}
          isOpen={openStoreId === store.id}
          onOpen={handleOpen}
          onClose={handleClose}
        />
      ))}
    </Map>
  )
}
