'use client'

import { useState, useCallback, useEffect } from 'react'

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
      return '現在地を表示するには、ブラウザの設定で位置情報を許可してください'
    case 3:
      return '位置情報の取得に時間がかかっています。もう一度お試しください'
    default:
      return '現在地を取得できませんでした。少し時間をおいてお試しください'
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
      setState((prev) => ({
        ...prev,
        error: '現在地を取得できませんでした。少し時間をおいてお試しください',
      }))
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

  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions) return
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        locate()
      }
    })
  }, [locate])

  return { ...state, locate }
}
