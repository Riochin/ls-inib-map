'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import type { Store } from '@/types/store'
import { getThemeKey } from '@/lib/marker-color'
import { getMarkerImage } from '@/lib/marker-image'

/** フォーカス時にクラスタを解除して個別マーカーを表示するズームレベル（クラスタラの maxZoom 超） */
const FOCUS_ZOOM = 17

/** クラスタバブルのブランド色（サイトの「両タイトル」紫に統一） */
const CLUSTER_COLOR = '#7B2FBE'

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

/** クラスタバブルの DOM。サイトのブランド紫で統一し、件数を中央に表示する */
function createClusterContent(count: number): HTMLDivElement {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52
  const el = document.createElement('div')
  el.textContent = String(count)
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'border-radius:50%',
    `background:${CLUSTER_COLOR}`,
    'color:#fff',
    'font-weight:700',
    'font-size:13px',
    'border:2px solid #fff',
    'box-shadow:0 2px 6px rgba(0,0,0,0.3)',
  ].join(';')
  return el
}

/** ブランド色のクラスタレンダラを生成する（marker ライブラリ必須） */
function createClusterRenderer(markerLibrary: google.maps.MarkerLibrary): Renderer {
  return {
    render: (cluster) =>
      new markerLibrary.AdvancedMarkerElement({
        position: cluster.position,
        content: createClusterContent(cluster.count),
        zIndex: 1000 + cluster.count,
      }),
  }
}

/**
 * `useMap` 経由で Google Maps 命令APIを隔離し、クラスタとマーカーのライフサイクルを管理する。
 * - 表示対象 `stores` を受け取り、店舗ID単位でマーカーをキャッシュしてクラスタラへ供給（Req1.1, 1.7）
 * - クラスタ集約/展開/解除・ビューポート除外はクラスタラのアルゴリズムへ委譲（Req1.1-1.3, 1.6）
 * - マーカークリックで `onMarkerClick(storeId)` を発火（InfoWindow 連携は MapView 側）
 */
export function useStoreClusterer({ stores, onMarkerClick }: UseStoreClustererParams): StoreClustererHandle {
  const map = useMap()
  // AdvancedMarkerElement を使うには 'marker' ライブラリのロードが必要（旧 <AdvancedMarker> が内部で行っていた）
  const markerLibrary = useMapsLibrary('marker')
  const [clusterer, setClusterer] = useState<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const storesByIdRef = useRef<Map<string, Store>>(new Map())

  // クリックハンドラは ref 経由で参照し、ハンドラ差し替えでマーカーを再生成しない
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  // クラスタラの初期化とアンマウント時のクリーンアップ（renderer に AdvancedMarkerElement を使うため marker ライブラリ必須）
  useEffect(() => {
    if (!map || !markerLibrary) return
    const instance = new MarkerClusterer({
      map,
      renderer: createClusterRenderer(markerLibrary),
    })
    setClusterer(instance)
    return () => {
      instance.clearMarkers()
      setClusterer(null)
      markersRef.current.clear()
    }
  }, [map, markerLibrary])

  // クラスタラと marker ライブラリが揃った後、stores 変化時に差分のみマーカーを追加/削除
  useEffect(() => {
    if (!clusterer || !markerLibrary) return

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
      const marker = new markerLibrary.AdvancedMarkerElement({
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
  }, [stores, clusterer, markerLibrary])

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
