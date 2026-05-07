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
  focusStore?: Store | null
  onFocusConsumed?: () => void
  onMapClick?: () => void
}

const DEFAULT_CENTER = { lat: 35.7337, lng: 139.7394 } // namco巣鴨店付近
const DEFAULT_ZOOM = 15

export function MapView({ stores, userLocation, focusStore, onFocusConsumed, onMapClick }: MapViewProps) {
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

  const handleMapClick = useCallback(() => {
    setOpenStoreId(null)
    onMapClick?.()
  }, [onMapClick])

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

  useEffect(() => {
    if (!map || !focusStore) return
    map.panTo({ lat: focusStore.lat, lng: focusStore.lng })
    map.setZoom(16)
    setOpenStoreId(focusStore.id)
    onFocusConsumed?.()
  }, [map, focusStore, onFocusConsumed])

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
      clickableIcons={false}
      onClick={handleMapClick}
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
          headerDisabled
        >
          <InfoWindowContent store={openStore} onClose={handleClose} />
        </InfoWindow>
      )}

      {userLocation && <CurrentLocationMarker position={userLocation} />}
    </Map>
  )
}

function InfoWindowContent({ store, onClose }: { store: Store; onClose: () => void }) {
  const theme = getMarkerTheme(store)
  return (
    <div className={`p-1 min-w-[200px] max-w-[260px] relative pr-5${store.closed ? ' bg-gray-100 rounded' : ''}`}>
      <button
        onClick={onClose}
        className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm leading-none"
      >
        ✕
      </button>
      <h3 className="font-bold text-base leading-snug mb-1 break-words whitespace-normal">{store.name}</h3>
      <p className="text-xs text-gray-600 mb-1">{store.address}</p>
      <div className="flex gap-1 mb-1.5">
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
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 002.144-1.64A19.253 19.253 0 0018.75 14C18.75 8.787 14.713 4.75 9.5 4.75S.25 8.787.25 14c0 2.154.848 4.29 2.216 6.11a19.253 19.253 0 004.144 3.601 16.975 16.975 0 002.144 1.64zM9.5 16.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" transform="translate(2.5 -2.5) scale(0.95)" />
        </svg>
        経路
      </a>
      {store.closed && (
        <span className="absolute bottom-1 right-1 text-xs text-gray-400 font-medium">閉店</span>
      )}
    </div>
  )
}
