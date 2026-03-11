'use client'

import { useState, useCallback } from 'react'
import { AdvancedMarker, InfoWindow, Pin, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Store } from '@/types/store'
import { getMarkerColor, getGameLabel } from '@/lib/marker-color'

interface StoreMarkerProps {
  store: Store
  isOpen: boolean
  onOpen: (storeId: string) => void
  onClose: () => void
}

export function StoreMarker({ store, isOpen, onOpen, onClose }: StoreMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const color = getMarkerColor(store)

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
        <Pin background={color} borderColor={color} glyphColor="white" />
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
                  className={`text-xs px-2 py-0.5 rounded-full text-white ${
                    game === 'jojo-ls' ? 'bg-purple-600' : 'bg-green-700'
                  }`}
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
