'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import type { Store } from '@/types/store'
import { getThemeKey } from '@/lib/marker-color'
import { getMarkerImage } from '@/lib/marker-image'

/** フォーカス時にクラスタを解除して個別マーカーを表示するズームレベル（クラスタラの maxZoom 超） */
const FOCUS_ZOOM = 17

export interface MarkerDiff {
  /** 新規に生成・追加すべき店舗ID */
  added: string[]
  /** 破棄・削除すべき店舗ID */
  removed: string[]
}

/**
 * 現在のマーカー集合と次の店舗集合の差分を算出する純関数（Req1.7）。
 * 同一集合（順序差を含む）では added/removed とも空になり、再生成を抑止する。
 */
export function computeMarkerDiff(
  currentIds: Iterable<string>,
  nextIds: Iterable<string>
): MarkerDiff {
  const current = new Set(currentIds)
  const next = new Set(nextIds)
  const added: string[] = []
  const removed: string[] = []
  for (const id of next) {
    if (!current.has(id)) added.push(id)
  }
  for (const id of current) {
    if (!next.has(id)) removed.push(id)
  }
  return { added, removed }
}

export interface UseStoreClustererParams {
  stores: Store[]
  onMarkerClick: (storeId: string) => void
}

export interface StoreClustererHandle {
  /**
   * 指定店舗へ pan/zoom してクラスタを解除し、当該マーカーを個別表示状態にする。
   * 低ズームでクラスタに埋もれた店舗にも検索/住所選択から到達できるようにする（Req1.2, 1.3）。
   */
  focusMarker: (storeId: string) => void
}

function createMarkerContent(store: Store): HTMLImageElement {
  const image = getMarkerImage(getThemeKey(store))
  const el = document.createElement('img')
  el.src = image.url
  el.width = image.width
  el.height = image.height
  el.style.cursor = 'pointer'
  return el
}

/**
 * `useMap` 経由で Google Maps 命令APIを隔離し、クラスタとマーカーのライフサイクルを管理する。
 * - 表示対象 `stores` を受け取り、店舗ID単位でマーカーをキャッシュしてクラスタラへ供給（Req1.1, 1.7）
 * - クラスタ集約/展開/解除・ビューポート除外はクラスタラのアルゴリズムへ委譲（Req1.1-1.3, 1.6）
 * - マーカークリックで `onMarkerClick(storeId)` を発火（InfoWindow 連携は MapView 側）
 */
export function useStoreClusterer({ stores, onMarkerClick }: UseStoreClustererParams): StoreClustererHandle {
  const map = useMap()
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const storesByIdRef = useRef<Map<string, Store>>(new Map())

  // クリックハンドラは ref 経由で参照し、ハンドラ差し替えでマーカーを再生成しない
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  // クラスタラの初期化とアンマウント時のクリーンアップ
  useEffect(() => {
    if (!map) return
    const clusterer = new MarkerClusterer({ map })
    clustererRef.current = clusterer
    return () => {
      clusterer.clearMarkers()
      clustererRef.current = null
      markersRef.current.clear()
    }
  }, [map])

  // stores 変化時に差分のみマーカーを追加/削除
  useEffect(() => {
    const clusterer = clustererRef.current
    if (!clusterer) return

    const cache = markersRef.current
    const byId = storesByIdRef.current
    byId.clear()
    for (const store of stores) byId.set(store.id, store)

    const { added, removed } = computeMarkerDiff(cache.keys(), byId.keys())
    if (added.length === 0 && removed.length === 0) return

    const addedMarkers: google.maps.marker.AdvancedMarkerElement[] = []
    for (const id of added) {
      const store = byId.get(id)
      if (!store) continue
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: store.lat, lng: store.lng },
        content: createMarkerContent(store),
        gmpClickable: true,
      })
      marker.addListener('gmp-click', () => onMarkerClickRef.current(id))
      cache.set(id, marker)
      addedMarkers.push(marker)
    }

    const removedMarkers: google.maps.marker.AdvancedMarkerElement[] = []
    for (const id of removed) {
      const marker = cache.get(id)
      if (!marker) continue
      removedMarkers.push(marker)
      cache.delete(id)
    }

    if (removedMarkers.length > 0) clusterer.removeMarkers(removedMarkers, true)
    if (addedMarkers.length > 0) clusterer.addMarkers(addedMarkers, true)
    clusterer.render()
  }, [stores])

  const focusMarker = useCallback(
    (storeId: string) => {
      const store = storesByIdRef.current.get(storeId)
      if (!map || !store) return
      map.panTo({ lat: store.lat, lng: store.lng })
      if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM)
    },
    [map]
  )

  return { focusMarker }
}
