'use client'

import { useCallback } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'
import { getMarkerTheme, getGameLabel } from '@/lib/marker-color'

interface StoreMarkerProps {
  store: Store
  isOpen: boolean
  onOpen: (storeId: string) => void
  onClose: () => void
}

export function StoreMarker({ store, isOpen, onOpen, onClose }: StoreMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const theme = getMarkerTheme(store)

  const handleClick = useCallback(() => {
    onOpen(store.id)
  }, [store.id, onOpen])

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: store.lat, lng: store.lng }}
        onClick={handleClick}
      >
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
          <defs>
            <linearGradient id={`grad-${store.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.gradientFrom} />
              <stop offset="100%" stopColor={theme.gradientTo} />
            </linearGradient>
          </defs>
          <path
            d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
            fill={`url(#grad-${store.id})`}
          />
          <circle cx="14" cy="14" r="5" fill="white" />
        </svg>
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow anchor={marker} onClose={onClose}>
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
        </InfoWindow>
      )}
    </>
  )
}
