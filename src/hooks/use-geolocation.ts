'use client'

import { useState, useCallback } from 'react'

interface GeolocationState {
  location: { lat: number; lng: number } | null
  isLocating: boolean
  error: string | null
}

interface UseGeolocationReturn extends GeolocationState {
  locate: () => void
}

export function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return '位置情報の利用が許可されていません'
    case 3:
      return '位置情報の取得がタイムアウトしました'
    default:
      return '現在位置を取得できません'
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLocating: false,
    error: null,
  })

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: '現在位置を取得できません' }))
      return
    }

    setState({ location: null, isLocating: true, error: null })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          isLocating: false,
          error: null,
        })
      },
      (error) => {
        setState({
          location: null,
          isLocating: false,
          error: getGeolocationErrorMessage(error.code),
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return { ...state, locate }
}
