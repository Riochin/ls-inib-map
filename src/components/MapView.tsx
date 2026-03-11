'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Map, useMap } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'
import { StoreMarker } from './StoreMarker'
import { CurrentLocationMarker } from './CurrentLocationMarker'

interface MapViewProps {
  stores: Store[]
  userLocation?: { lat: number; lng: number } | null
}

const DEFAULT_CENTER = { lat: 35.68, lng: 139.77 }
const DEFAULT_ZOOM = 10

export function MapView({ stores, userLocation }: MapViewProps) {
  const map = useMap()
  const [openStoreId, setOpenStoreId] = useState<string | null>(null)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  const handleOpen = useCallback((storeId: string) => {
    setOpenStoreId(storeId)
  }, [])

  const handleClose = useCallback(() => {
    setOpenStoreId(null)
  }, [])

  useEffect(() => {
    if (!map || !userLocation) return
    if (
      prevLocationRef.current &&
      prevLocationRef.current.lat === userLocation.lat &&
      prevLocationRef.current.lng === userLocation.lng
    ) return
    prevLocationRef.current = userLocation
    map.panTo(userLocation)
    map.setZoom(14)
  }, [map, userLocation])

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
      {userLocation && <CurrentLocationMarker position={userLocation} />}
    </Map>
  )
}
