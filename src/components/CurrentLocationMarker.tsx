'use client'

import { AdvancedMarker } from '@vis.gl/react-google-maps'

interface CurrentLocationMarkerProps {
  position: { lat: number; lng: number }
}

export function CurrentLocationMarker({ position }: CurrentLocationMarkerProps) {
  return (
    <AdvancedMarker position={position}>
      <div className="relative">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
        <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-40" />
      </div>
    </AdvancedMarker>
  )
}
