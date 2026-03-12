'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Map, useMap, InfoWindow } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'
import { StoreMarker } from './StoreMarker'
import { CurrentLocationMarker } from './CurrentLocationMarker'
import { GRADIENT_DEFS, getMarkerTheme, getGameLabel } from '@/lib/marker-color'
import { useVisibleStores } from '@/hooks/use-visible-stores'

interface MapViewProps {
  stores: Store[]
  userLocation?: { lat: number; lng: number } | null
}

const DEFAULT_CENTER = { lat: 35.68, lng: 139.77 }
const DEFAULT_ZOOM = 10

export function MapView({ stores, userLocation }: MapViewProps) {
  const map = useMap()
  const visibleStores = useVisibleStores(stores)
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

  const openStore = useMemo(
    () => (openStoreId ? stores.find((s) => s.id === openStoreId) ?? null : null),
    [openStoreId, stores]
  )

  return (
    <Map
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      gestureHandling="greedy"
      disableDefaultUI
      zoomControl
      onClick={handleClose}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Shared SVG gradient definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {GRADIENT_DEFS.map((g) => (
            <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={g.from} />
              <stop offset="100%" stopColor={g.to} />
            </linearGradient>
          ))}
        </defs>
      </svg>

      {visibleStores.map((store) => (
        <StoreMarker
          key={store.id}
          store={store}
          onOpen={handleOpen}
        />
      ))}

      {/* Single InfoWindow for the selected store */}
      {openStore && (
        <InfoWindow
          position={{ lat: openStore.lat, lng: openStore.lng }}
          onClose={handleClose}
        >
          <InfoWindowContent store={openStore} />
        </InfoWindow>
      )}

      {userLocation && <CurrentLocationMarker position={userLocation} />}
    </Map>
  )
}

function InfoWindowContent({ store }: { store: Store }) {
  const theme = getMarkerTheme(store)
  return (
    <div className="p-1 min-w-[200px]">
      <h3 className="font-bold text-sm mb-1">{store.name}</h3>
      <p className="text-xs text-gray-600 mb-1">{store.address}</p>
      <div className="flex gap-1">
        {store.games.map((game) => (
          <span
            key={game}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
          >
            {getGameLabel(game)}
          </span>
        ))}
      </div>
    </div>
  )
}
