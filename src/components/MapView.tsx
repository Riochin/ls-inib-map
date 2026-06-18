'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Map, useMap, InfoWindow } from '@vis.gl/react-google-maps'
import type { Store, GameTitle } from '@/types/store'
import { CurrentLocationMarker } from './CurrentLocationMarker'
import { ApproximateCircle } from './ApproximateCircle'
import { StoreInfoForm } from './StoreInfoForm'
import { StoreDetailModal } from './StoreDetailModal'
import { formatDateJst } from '@/lib/info-display'
import { storesMeta } from '@/data/stores'
import { getMarkerTheme, getGameLabel, getStoreStatusLabel, getCountSourceInfo } from '@/lib/marker-color'
import { buildShareText } from '@/lib/share'
import { CountBadge } from './CountBadge'
import { useStoreClusterer } from '@/hooks/use-store-clusterer'

interface MapViewProps {
  stores: Store[]
  userLocation?: { lat: number; lng: number } | null
  focusStore?: Store | null
  onFocusConsumed?: () => void
  onMapClick?: () => void
}

const DEFAULT_CENTER = { lat: 35.7337, lng: 139.7394 } // namco巣鴨店付近
const DEFAULT_ZOOM = 15

export function MapView({ stores, userLocation, focusStore, onFocusConsumed, onMapClick }: MapViewProps) {
  const map = useMap()
  const [openStoreId, setOpenStoreId] = useState<string | null>(null)
  const [detailStore, setDetailStore] = useState<Store | null>(null)
  const [infoFormStore, setInfoFormStore] = useState<Store | null>(null)
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null)

  const handleOpen = useCallback((storeId: string) => {
    setOpenStoreId(storeId)
  }, [])

  const { focusMarker } = useStoreClusterer({ stores, onMarkerClick: handleOpen })

  const handleClose = useCallback(() => {
    setOpenStoreId(null)
  }, [])

  const handleMapClick = useCallback(() => {
    setOpenStoreId(null)
    onMapClick?.()
  }, [onMapClick])

  useEffect(() => {
    if (!map || !userLocation) return
    if (
      prevLocationRef.current &&
      prevLocationRef.current.lat === userLocation.lat &&
      prevLocationRef.current.lng === userLocation.lng
    ) return
    prevLocationRef.current = userLocation
    map.panTo(userLocation)
    map.setZoom(14)
  }, [map, userLocation])

  useEffect(() => {
    if (!map || !focusStore) return
    // クラスタに埋もれた店舗でも個別表示されるよう pan/zoom→de-cluster してから開く
    focusMarker(focusStore.id)
    setOpenStoreId(focusStore.id)
    setDetailStore(focusStore)
    onFocusConsumed?.()
  }, [map, focusStore, focusMarker, onFocusConsumed])

  const openStore = useMemo(
    () => (openStoreId ? stores.find((s) => s.id === openStoreId) ?? null : null),
    [openStoreId, stores]
  )

  return (
    <>
    <Map
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      gestureHandling="greedy"
      disableDefaultUI
      zoomControl
      clickableIcons={false}
      onClick={handleMapClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* マーカーは useStoreClusterer が命令的に描画する（クラスタリング） */}

      {/* 選択中の店がジオコード低精度なら「おおよその範囲」円を描く */}
      {openStore?.approximateLocation && (
        <ApproximateCircle position={{ lat: openStore.lat, lng: openStore.lng }} />
      )}

      {/* Single InfoWindow for the selected store */}
      {openStore && (
        <InfoWindow
          position={{ lat: openStore.lat, lng: openStore.lng }}
          headerDisabled
        >
          <InfoWindowContent
            store={openStore}
            onClose={handleClose}
            onOpenDetail={() => setDetailStore(openStore)}
          />
        </InfoWindow>
      )}

      {userLocation && <CurrentLocationMarker position={userLocation} />}
    </Map>
    {detailStore && (
      <StoreDetailModal
        store={detailStore}
        onClose={() => setDetailStore(null)}
        onOpenInfoForm={() => setInfoFormStore(detailStore)}
      />
    )}
    {infoFormStore && <StoreInfoForm store={infoFormStore} onClose={() => setInfoFormStore(null)} />}
    </>
  )
}

function InfoWindowContent({
  store,
  onClose,
  onOpenDetail,
}: {
  store: Store
  onClose: () => void
  onOpenDetail: () => void
}) {
  const theme = getMarkerTheme(store)
  // 閉店（🌸）・移設（公式一覧から消失）はグレー背景＋状態ラベルで通常店舗と区別する
  const statusLabel = getStoreStatusLabel(store)
  // タップされた台数バッジの出どころ説明を表示する（ノンテック層向け・アイコン不使用）
  const [openSource, setOpenSource] = useState<GameTitle | null>(null)
  // 店舗単位の情報更新日。override（手動確定）の日付を優先し、無ければ全体の自動更新日。
  const infoDateLabel = formatDateJst(store.infoUpdatedAt ?? storesMeta.lastUpdated)
  // シェア：モバイルはネイティブ共有シート、非対応(PC等)はクリップボードへコピーにフォールバック。
  // コピー結果は一定時間だけアイコンで示す。タイマーは ref で保持し、アンマウント時にクリアして
  // アンマウント後の setState を防ぐ（連打時も前のタイマーを潰して多重発火させない）。
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = useCallback((next: 'copied' | 'failed') => {
    setShareState(next)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setShareState('idle'), 1500)
  }, [])
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current)
  }, [])
  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?store=${store.id}` : ''
    const text = buildShareText(store)
    // 共有シート対応端末はそちら（キャンセルは正常系なので握りつぶす）
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: store.name, text, url })
      } catch {
        // 共有シートのキャンセル等は無視する
      }
      return
    }
    // 非対応(PC等)はクリップボードへコピー。権限エラー等の失敗はユーザーに知らせる。
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(`${text}\n${url}`.trim())
      flash('copied')
    } catch {
      flash('failed')
    }
  }, [store, flash])
  const shareLabel =
    shareState === 'copied'
      ? 'リンクをコピーしました'
      : shareState === 'failed'
        ? 'コピーに失敗しました'
        : 'この店舗を共有'
  return (
    <div className={`p-1.5 min-w-[210px] max-w-[min(300px,85vw)]${statusLabel ? ' bg-gray-100 rounded' : ''}`}>
      {/* ヘッダ：店名（折り返し可）と ✕ を横並びにして重なりを防ぐ */}
      <div className="flex items-start gap-1 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <h3 className="font-bold text-[17px] leading-snug break-words min-w-0">{store.name}</h3>
          {statusLabel && (
            <span className="shrink-0 mt-0.5 text-[11px] text-gray-500 font-medium whitespace-nowrap">
              {statusLabel}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="shrink-0 -mr-0.5 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm leading-none"
        >
          ✕
        </button>
      </div>
      {/* 住所は詳細モーダルに出すため、クイック表示では省略（一目見る用に簡潔化） */}
      {store.approximateLocation && (
        <p className="text-[11px] text-amber-700 mb-1.5 leading-snug">
          ピンはおおよその位置です（住所から推定。実際の場所と少しずれている場合があります）
        </p>
      )}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {store.games.map((game) => {
          // 運営確認のみ確定（通常色）、それ以外は薄い。タップで出どころ表示
          const info = getCountSourceInfo(store.countSources?.[game])
          return (
            <CountBadge
              key={game}
              game={game}
              count={store.machineCounts?.[game]}
              theme={theme}
              confirmed={info.confirmed}
              onClick={() => setOpenSource((cur) => (cur === game ? null : game))}
              title="タップで台数の出どころを表示"
            />
          )
        })}
      </div>
      {openSource && (
        <p className="text-[11px] text-gray-500 mb-1.5 leading-snug">
          {getGameLabel(openSource)}：{getCountSourceInfo(store.countSources?.[openSource]).label}
        </p>
      )}
      {/* 店舗単位の情報更新日。override（手動確定）があればその日付、無ければ全体の自動更新日。 */}
      {infoDateLabel && (
        <p className="text-[10px] text-gray-400 mb-1.5">情報更新: {infoDateLabel}</p>
      )}
      {/* 経路・シェア・報告は最下部に置く（報告導線が一番手に取りやすい位置） */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 002.144-1.64A19.253 19.253 0 0018.75 14C18.75 8.787 14.713 4.75 9.5 4.75S.25 8.787.25 14c0 2.154.848 4.29 2.216 6.11a19.253 19.253 0 004.144 3.601 16.975 16.975 0 002.144 1.64zM9.5 16.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" transform="translate(2.5 -2.5) scale(0.95)" />
            </svg>
            経路
          </a>
          <button
            type="button"
            onClick={handleShare}
            aria-label={shareLabel}
            title={shareLabel}
            className="inline-flex items-center text-gray-500 hover:text-gray-700"
          >
            {shareState === 'copied' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-green-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : shareState === 'failed' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-600">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          詳細を見る
        </button>
      </div>
    </div>
  )
}
