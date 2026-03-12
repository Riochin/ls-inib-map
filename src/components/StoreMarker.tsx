'use client'

import { memo, useCallback } from 'react'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'
import { getThemeKey } from '@/lib/marker-color'

interface StoreMarkerProps {
  store: Store
  onOpen: (storeId: string) => void
}

export const StoreMarker = memo(function StoreMarker({ store, onOpen }: StoreMarkerProps) {
  const themeKey = getThemeKey(store)

  const handleClick = useCallback(() => {
    onOpen(store.id)
  }, [store.id, onOpen])

  return (
    <AdvancedMarker
      position={{ lat: store.lat, lng: store.lng }}
      onClick={handleClick}
    >
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
          fill={`url(#grad-${themeKey})`}
        />
        <circle cx="14" cy="14" r="5" fill="white" />
      </svg>
    </AdvancedMarker>
  )
})
