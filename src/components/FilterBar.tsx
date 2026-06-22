'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { FilterOption } from '@/types/store'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'

interface FilterBarProps {
  activeFilter: FilterOption
  onFilterChange: (filter: FilterOption) => void
}

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'jojo-ls', label: 'ラスサバ' },
  { value: 'gundam-exvs', label: 'イニブ' },
]

const ACTIVE_BG_COLORS: Record<FilterOption, string> = {
  all: '#111827',
  'jojo-ls': '#7B2FBE',
  'gundam-exvs': '#2563EB',
}

const ACTIVE_GLOW_COLORS: Record<FilterOption, string> = {
  all: 'rgba(17, 24, 39, 0.3)',
  'jojo-ls': 'rgba(123, 47, 190, 0.35)',
  'gundam-exvs': 'rgba(37, 99, 235, 0.35)',
}

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<FilterOption, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)
  const [prevFilter, setPrevFilter] = useState<FilterOption>(activeFilter)
  // 旧フィルターが追いつくまでの 280ms が遷移中。state を持たず派生値で表現する
  const isTransitioning = mounted && activeFilter !== prevFilter

  const updateIndicator = useCallback(() => {
    const container = containerRef.current
    const activeButton = buttonRefs.current.get(activeFilter)
    if (!container || !activeButton) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()
    setIndicator({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    })
  }, [activeFilter])

  useEffect(() => {
    updateIndicator()
    if (!mounted) {
      requestAnimationFrame(() => setMounted(true))
    }
  }, [activeFilter, updateIndicator, mounted])

  // Crossfade: 遷移開始から 280ms 後に旧フィルターを追従させる（isTransitioning は派生値）
  useEffect(() => {
    if (activeFilter !== prevFilter && mounted) {
      const timer = setTimeout(() => setPrevFilter(activeFilter), 280)
      return () => clearTimeout(timer)
    }
  }, [activeFilter, prevFilter, mounted])

  const fluidEasing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-1.5 shadow-lg whitespace-nowrap"
    >
      {/* Outgoing color layer (fades out) */}
      <div
        className="absolute rounded-full"
        style={{
          left: indicator.left,
          width: indicator.width,
          top: 6,
          bottom: 6,
          backgroundColor: ACTIVE_BG_COLORS[prevFilter],
          opacity: isTransitioning ? 0 : 1,
          transition: mounted
            ? `left 0.25s ${fluidEasing}, width 0.22s ${fluidEasing}, opacity 0.25s ease-out`
            : 'none',
        }}
      />
      {/* Incoming color layer (fades in) */}
      <div
        className="absolute rounded-full"
        style={{
          left: indicator.left,
          width: indicator.width,
          top: 6,
          bottom: 6,
          backgroundColor: ACTIVE_BG_COLORS[activeFilter],
          boxShadow: `0 2px 10px ${ACTIVE_GLOW_COLORS[activeFilter]}`,
          opacity: isTransitioning ? 1 : 1,
          transition: mounted
            ? `left 0.25s ${fluidEasing}, width 0.22s ${fluidEasing}, opacity 0.25s ease-in, box-shadow 0.3s ease`
            : 'none',
        }}
      />
      {FILTERS.map(({ value, label }) => {
        const isActive = activeFilter === value
        return (
          <button
            key={value}
            ref={(el) => {
              if (el) buttonRefs.current.set(value, el)
            }}
            onClick={() => onFilterChange(value)}
            style={{ fontFamily: HEADING_FONT_STYLE.fontFamily }}
            className={`relative z-[1] px-4 py-2 rounded-full text-sm font-medium min-h-[44px] min-w-[44px] transition-colors duration-250 ${
              isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100/60'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
