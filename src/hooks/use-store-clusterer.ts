'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import type { Store } from '@/types/store'
import { getThemeByKey, getThemeKey, getStoreStatusLabel } from '@/lib/marker-color'
import { getMarkerImage, MARKER_SHADOW_FILTER } from '@/lib/marker-image'

/** フォーカス時にクラスタを解除して個別マーカーを表示するズームレベル（クラスタラの maxZoom 超） */
const FOCUS_ZOOM = 17

/** クラスタバブルの色。ラスサバを含めば紫、イニブのみなら青（個別ピンの配色に揃える） */
const CLUSTER_COLOR_WITH_JOJO = getThemeByKey('both').gradientFrom
const CLUSTER_COLOR_GUNDAM_ONLY = getThemeByKey('gundamOnly').gradientFrom

type AdvancedMarker = google.maps.marker.AdvancedMarkerElement

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
  // 影は SVG ではなく CSS 側で付け、高DPI端末でもピンをぼかさない（marker-image 参照）
  el.style.filter = MARKER_SHADOW_FILTER
  // AdvancedMarkerElement は下辺中央を座標に合わせる。先端は余白ぶん下辺から
  // 浮いているので、そのぶん下へずらして先端を正確に座標へ刺す。
  if (image.anchorBottomOffset) {
    el.style.transform = `translateY(${image.anchorBottomOffset}px)`
  }
  return el
}

/**
 * マーカーの見た目に影響する状態の署名。店舗IDは住所＋店名のハッシュで安定するため、
 * IDが同じでも closed/delisted/games/座標が変われば再描画が要る。差分検出に用いる。
 */
function markerSignature(store: Store): string {
  return `${getThemeKey(store)}|${store.lat}|${store.lng}|${store.games.includes('jojo-ls') ? 1 : 0}`
}

/** マーカーのアクセシブルネーム（スクリーンリーダー用の名前・マウスホバー時のツールチップ）。 */
function markerTitle(store: Store): string {
  const status = getStoreStatusLabel(store)
  return status ? `${store.name}（${status}）` : store.name
}

/** クラスタバブルの DOM。配色（紫/青）を受け取り、件数を中央に表示する */
function createClusterContent(count: number, color: string): HTMLDivElement {
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
    `background:${color}`,
    'color:#fff',
    'font-weight:700',
    'font-size:13px',
    'border:2px solid #fff',
    'box-shadow:0 2px 6px rgba(0,0,0,0.3)',
  ].join(';')
  return el
}

/**
 * クラスタレンダラを生成する（marker ライブラリ必須）。
 * クラスタ内のいずれかの店舗がラスサバを含めば紫、イニブのみなら青で描画する。
 */
function createClusterRenderer(
  markerLibrary: google.maps.MarkerLibrary,
  markerHasJojo: WeakMap<AdvancedMarker, boolean>
): Renderer {
  return {
    render: (cluster) => {
      const hasJojo = cluster.markers?.some(
        (m) => markerHasJojo.get(m as AdvancedMarker) ?? false
      )
      const color = hasJojo ? CLUSTER_COLOR_WITH_JOJO : CLUSTER_COLOR_GUNDAM_ONLY
      return new markerLibrary.AdvancedMarkerElement({
        position: cluster.position,
        content: createClusterContent(cluster.count, color),
        zIndex: 1000 + cluster.count,
        gmpClickable: true,
        title: `${cluster.count}件の店舗（まとまったピン）`,
      })
    },
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
  const markersRef = useRef<Map<string, AdvancedMarker>>(new Map())
  const storesByIdRef = useRef<Map<string, Store>>(new Map())
  // マーカー→ラスサバ含有フラグ。クラスタ色の判定（紫/青）に用いる
  const markerHasJojoRef = useRef<WeakMap<AdvancedMarker, boolean>>(new WeakMap())
  // 店舗ID→現在の見た目署名。状態変化（closed/delisted/games/座標）の再描画判定に用いる
  const markerSigRef = useRef<Map<string, string>>(new Map())
  // 店舗ID→クリックリスナーのハンドル。マーカー破棄時に解放してリークを防ぐ
  const listenersRef = useRef<Map<string, google.maps.MapsEventListener>>(new Map())

  // クリックハンドラは ref 経由で参照し、ハンドラ差し替えでマーカーを再生成しない。
  // ref 書き込みはレンダー中ではなく effect 内で行う（current は非同期のクリック
  // コールバックでのみ読まれるため commit 後更新で十分・react-hooks/refs 準拠）
  const onMarkerClickRef = useRef(onMarkerClick)
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
  })

  // クラスタラの初期化とアンマウント時のクリーンアップ（renderer に AdvancedMarkerElement を使うため marker ライブラリ必須）
  useEffect(() => {
    if (!map || !markerLibrary) return
    const instance = new MarkerClusterer({
      map,
      renderer: createClusterRenderer(markerLibrary, markerHasJojoRef.current),
    })
    setClusterer(instance)
    return () => {
      instance.clearMarkers()
      setClusterer(null)
      markersRef.current.clear()
      // クリックリスナーを解放してから署名キャッシュも破棄する（リーク防止）
      for (const listener of listenersRef.current.values()) listener.remove()
      listenersRef.current.clear()
      markerSigRef.current.clear()
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

    // IDは不変でも closed/delisted/games/座標が変わった既存マーカーは再描画が要る。
    // 差分検出を素通りして古いピン画像が残るのを防ぐため、署名変化を検出して更新する。
    const changed: string[] = []
    for (const id of cache.keys()) {
      const store = byId.get(id)
      if (!store) continue // removed 側で破棄される
      if (markerSigRef.current.get(id) !== markerSignature(store)) changed.push(id)
    }

    if (added.length === 0 && removed.length === 0 && changed.length === 0) return

    const addedMarkers: AdvancedMarker[] = []
    for (const id of added) {
      const store = byId.get(id)
      if (!store) continue
      const marker = new markerLibrary.AdvancedMarkerElement({
        position: { lat: store.lat, lng: store.lng },
        content: createMarkerContent(store),
        gmpClickable: true,
        title: markerTitle(store),
      })
      const listener = marker.addListener('gmp-click', () => onMarkerClickRef.current(id))
      listenersRef.current.set(id, listener)
      markerHasJojoRef.current.set(marker, store.games.includes('jojo-ls'))
      markerSigRef.current.set(id, markerSignature(store))
      cache.set(id, marker)
      addedMarkers.push(marker)
    }

    // 既存マーカーの状態更新（content/座標/ラスサバ含有フラグを差し替える）
    for (const id of changed) {
      const marker = cache.get(id)
      const store = byId.get(id)
      if (!marker || !store) continue
      marker.content = createMarkerContent(store)
      marker.position = { lat: store.lat, lng: store.lng }
      marker.title = markerTitle(store)
      markerHasJojoRef.current.set(marker, store.games.includes('jojo-ls'))
      markerSigRef.current.set(id, markerSignature(store))
    }

    const removedMarkers: AdvancedMarker[] = []
    for (const id of removed) {
      const marker = cache.get(id)
      if (!marker) continue
      listenersRef.current.get(id)?.remove()
      listenersRef.current.delete(id)
      markerHasJojoRef.current.delete(marker)
      markerSigRef.current.delete(id)
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
