'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

/** Filter stores within bounds expanded by a padding ratio. Pure function for testability. */
export function filterStoresByBounds(stores: Store[], bounds: Bounds, padding = 0.2): Store[] {
  const latPad = (bounds.north - bounds.south) * padding
  const lngPad = (bounds.east - bounds.west) * padding

  const north = bounds.north + latPad
  const south = bounds.south - latPad
  const east = bounds.east + lngPad
  const west = bounds.west - lngPad

  return stores.filter(
    (s) => s.lat >= south && s.lat <= north && s.lng >= west && s.lng <= east
  )
}

/**
 * Returns only stores within the current map viewport (with padding).
 * Uses the map's `idle` event to avoid excessive recalculation during pan/zoom.
 */
export function useVisibleStores(stores: Store[]): Store[] {
  const map = useMap()
  const [bounds, setBounds] = useState<google.maps.LatLngBounds | null>(null)

  useEffect(() => {
    if (!map) return

    const updateBounds = () => {
      const b = map.getBounds()
      if (b) setBounds(b)
    }

    // Set initial bounds
    updateBounds()

    const listener = map.addListener('idle', updateBounds)
    return () => listener.remove()
  }, [map])

  return useMemo(() => {
    if (!bounds) return stores

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    return filterStoresByBounds(stores, {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    })
  }, [stores, bounds])
}
