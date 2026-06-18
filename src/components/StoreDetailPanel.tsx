'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Store, GameTitle, StoreAttributeKey } from '@/types/store'
import { formatDateJst } from '@/lib/info-display'
import { storesMeta } from '@/data/stores'
import { getMarkerTheme, getGameLabel, getCountSourceInfo, getStoreStatusLabel } from '@/lib/marker-color'
import { buildShareText } from '@/lib/share'
import { CountBadge } from './CountBadge'

interface StoreDetailPanelProps {
  store: Store
  onOpenInfoForm: () => void
  onClose: () => void
}

const TERNARY_LABELS: Record<string, string> = {
  yes: 'あり',
  no: 'なし',
  unknown: '不明',
}

function AttributeRow({
  label,
  value,
  isUserReport,
}: {
  label: string
  value: string | undefined
  isUserReport: boolean
}) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      {value === undefined ? (
        <span className="text-xs text-gray-400">未登録</span>
      ) : (
        <span className={`text-xs text-right${isUserReport ? ' text-amber-700' : ' text-gray-800'}`}>
          {value}
          {isUserReport ? '（未確認）' : ''}
        </span>
      )}
    </div>
  )
}

export function StoreDetailPanel({ store, onOpenInfoForm, onClose }: StoreDetailPanelProps) {
  const theme = getMarkerTheme(store)
  const statusLabel = getStoreStatusLabel(store)
  const [openSource, setOpenSource] = useState<GameTitle | null>(null)
  const infoDateLabel = formatDateJst(store.infoUpdatedAt ?? storesMeta.lastUpdated)

  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((next: 'copied' | 'failed') => {
    setShareState(next)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setShareState('idle'), 1500)
  }, [])

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?store=${store.id}` : ''
    const text = buildShareText(store)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: store.name, text, url })
      } catch {
        // キャンセル等は無視
      }
      return
    }
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

  function isUserReport(key: StoreAttributeKey): boolean {
    return store.attributeSources?.[key] === 'user-report'
  }

  const smokingValue = store.smoking !== undefined ? TERNARY_LABELS[store.smoking] : undefined
  const hasRecordingValue = store.hasRecording !== undefined ? TERNARY_LABELS[store.hasRecording] : undefined
  const hasStreamingValue = store.hasStreaming !== undefined ? TERNARY_LABELS[store.hasStreaming] : undefined
  const paymentsValue = store.payments?.length ? store.payments.join('、') : undefined

  return (
    <div className="p-4 text-sm text-gray-800">
      {/* ヘッダ：店名・状態ラベル・閉じるボタン */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {/* 店名は任意文字列でサブセット不可のため、丸ゴシックは当てずシステムフォント太字で統一
              （クイック表示の InfoWindow と同じ見た目。文字ごとの太さムラを防ぐ） */}
          <h2 className="font-bold text-[18px] leading-snug break-words min-w-0">
            {store.name}
          </h2>
          {statusLabel && (
            <span className="shrink-0 mt-1 text-[11px] text-gray-500 font-medium whitespace-nowrap">
              {statusLabel}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-gray-600 mb-3">{store.address}</p>

      {/* おおよその位置注記 */}
      {store.approximateLocation && (
        <p className="text-[11px] text-amber-700 mb-3 leading-snug">
          ピンはおおよその位置です（住所から推定。実際の場所と少しずれている場合があります）
        </p>
      )}

      {/* 設置台数 */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">設置台数</p>
        <div className="flex flex-wrap gap-1">
          {store.games.map((game) => {
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
          <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
            {getGameLabel(openSource)}：{getCountSourceInfo(store.countSources?.[openSource]).label}
          </p>
        )}
      </div>

      {/* 拡張属性一覧 */}
      <div className="bg-gray-50 rounded-xl px-3 py-0.5 mb-3">
        <AttributeRow label="営業時間" value={store.businessHours} isUserReport={isUserReport('businessHours')} />
        <AttributeRow label="フロア" value={store.floor} isUserReport={isUserReport('floor')} />
        <AttributeRow label="喫煙所" value={smokingValue} isUserReport={isUserReport('smoking')} />
        <AttributeRow label="決済/電子マネー" value={paymentsValue} isUserReport={isUserReport('payments')} />
        <AttributeRow label="録画台" value={hasRecordingValue} isUserReport={isUserReport('hasRecording')} />
        <AttributeRow label="配信台" value={hasStreamingValue} isUserReport={isUserReport('hasStreaming')} />
      </div>

      {/* 情報更新日 */}
      {infoDateLabel && (
        <p className="text-[10px] text-gray-400 mb-3">情報更新: {infoDateLabel}</p>
      )}

      {/* 経路・シェア */}
      <div className="flex items-center gap-4 mb-4">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 002.144-1.64A19.253 19.253 0 0018.75 14C18.75 8.787 14.713 4.75 9.5 4.75S.25 8.787.25 14c0 2.154.848 4.29 2.216 6.11a19.253 19.253 0 004.144 3.601 16.975 16.975 0 002.144 1.64zM9.5 16.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
              transform="translate(2.5 -2.5) scale(0.95)"
            />
          </svg>
          経路を調べる
        </a>
        <button
          type="button"
          onClick={handleShare}
          aria-label={shareLabel}
          title={shareLabel}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {shareState === 'copied' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 text-green-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : shareState === 'failed' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 text-red-600"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
          <span>{shareLabel}</span>
        </button>
      </div>

      {/* 情報を提供ボタン */}
      <button
        type="button"
        onClick={onOpenInfoForm}
        className="w-full px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors"
      >
        情報を提供する
      </button>
    </div>
  )
}
