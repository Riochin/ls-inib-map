'use client'

import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

/**
 * 「おおよその位置」を示す円。選択中の店舗がジオコード低精度（`approximateLocation`）の
 * ときだけ、ピンの周囲に薄い円を1つ描く（スマホGPS/Googleマップの精度円と同じ発想）。
 *
 * 地理半径（メートル）なのでズームに追従する。クリック透過で操作の邪魔をしない。
 * 全該当店をまとめて描くと地図が汚れるため、呼び出し側で「選択中の1店」に限定する。
 */
const APPROX_RADIUS_M = 300

export function ApproximateCircle({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const circle = new google.maps.Circle({
      map,
      center: position,
      radius: APPROX_RADIUS_M,
      clickable: false,
      strokeColor: '#b45309', // amber-700
      strokeOpacity: 0.5,
      strokeWeight: 1,
      fillColor: '#f59e0b', // amber-500
      fillOpacity: 0.12,
    })
    return () => circle.setMap(null)
  }, [map, position.lat, position.lng])

  return null
}
