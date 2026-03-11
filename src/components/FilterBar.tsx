'use client'

import type { FilterOption } from '@/types/store'
import { getFilterActiveColor } from '@/lib/marker-color'

interface FilterBarProps {
  activeFilter: FilterOption
  onFilterChange: (filter: FilterOption) => void
}

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'jojo-ls', label: 'ラスサバ' },
  { value: 'gundam-exvs', label: 'イニブ' },
]

export function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg whitespace-nowrap">
      {FILTERS.map(({ value, label }) => {
        const isActive = activeFilter === value
        const activeColor = getFilterActiveColor(value)
        return (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
              isActive
                ? `${activeColor.bg} ${activeColor.text}`
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
