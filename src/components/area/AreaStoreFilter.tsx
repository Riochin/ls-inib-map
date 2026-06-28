'use client'

import { useState, useMemo } from 'react'
import type { GameTitle, Store } from '@/types/store'
import { EMPTY_FACILITY_FILTER } from '@/types/store'
import { filterAreaStoresByGame } from '@/lib/area-store-filter'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { AreaStoreSections } from '@/components/area/AreaStoreSections'

/**
 * 県ページ内の店舗検索・絞り込みアイランド（クライアント・段階的強化）。
 *
 * 店名・住所のフリーテキストと設備ファセット（最低台数・配信台・録画台・喫煙所）で、
 * 県内一覧をその場で絞る。一致は純関数 {@link filterAreaStoresByGame}（＝既存の
 * `filterStoresByKeyword` / `filterStoresByFacility` を共有）に委譲し、エリア側で再実装しない。
 *
 * 初期 state は「検索語なし・ファセットなし」のため初期描画は全店一覧（サーバー描画と一致）で、
 * JS無効でも全店が見える（Req 7.1）。「営業中のみ」は県ページが既に営業中のみのため提供しない。
 * UI は `FilterBar` のピル/チップの見た目を踏襲しつつ、地図オーバーレイではなくドキュメントフロー配置。
 */

const BRAND_PURPLE = '#7B2FBE'

/** 最低台数プリセット（当該タイトルの台数でスコープ）。 */
const MIN_MACHINE_PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: '指定なし' },
  { value: 4, label: '4台〜' },
  { value: 8, label: '8台〜' },
  { value: 16, label: '16台〜' },
]

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors min-h-[36px] ${
        active ? 'text-white border-transparent' : 'text-gray-600 border-purple-100 hover:bg-purple-50'
      }`}
      style={active ? { backgroundColor: BRAND_PURPLE } : { backgroundColor: '#fff' }}
    >
      {children}
    </button>
  )
}

export function AreaStoreFilter({
  storesByGame,
  prefecture,
}: {
  storesByGame: Record<GameTitle, Store[]>
  prefecture: string
}) {
  const [query, setQuery] = useState('')
  const [minMachines, setMinMachines] = useState<number | null>(null)
  const [hasStreaming, setHasStreaming] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [hasSmoking, setHasSmoking] = useState(false)

  const visibleByGame = useMemo(
    () =>
      filterAreaStoresByGame(storesByGame, {
        query,
        facility: { ...EMPTY_FACILITY_FILTER, minMachines, hasStreaming, hasRecording, hasSmoking },
      }),
    [storesByGame, query, minMachines, hasStreaming, hasRecording, hasSmoking],
  )

  const total = (Object.keys(visibleByGame) as GameTitle[]).reduce(
    (sum, game) => sum + visibleByGame[game].length,
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-purple-100 bg-white/80 p-4">
        {/* フリーテキスト */}
        <div className="flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-2">
          <svg
            className="h-4 w-4 shrink-0 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="店名・住所で絞り込む"
            aria-label="店名・住所で絞り込む"
            className="min-h-[36px] flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="検索をクリア"
              className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* 最低台数 */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-gray-500">最低台数</p>
          <div className="flex flex-wrap gap-1.5">
            {MIN_MACHINE_PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                active={minMachines === preset.value}
                onClick={() => setMinMachines(preset.value)}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* 設備 */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-gray-500">設備</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={hasStreaming} onClick={() => setHasStreaming((v) => !v)}>
              配信台あり
            </Chip>
            <Chip active={hasRecording} onClick={() => setHasRecording((v) => !v)}>
              録画台あり
            </Chip>
            <Chip active={hasSmoking} onClick={() => setHasSmoking((v) => !v)}>
              喫煙所あり
            </Chip>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <p className="rounded-xl border border-purple-100 bg-white px-4 py-6 text-center text-sm text-gray-500">
          該当する店舗がありません。条件をゆるめてお試しください。
        </p>
      ) : (
        <AreaStoreSections storesByGame={visibleByGame} prefecture={prefecture} />
      )}

      <p className="text-xs text-gray-400" style={HEADING_FONT_STYLE}>
        {prefecture}内 {total}店を表示中
      </p>
    </div>
  )
}
