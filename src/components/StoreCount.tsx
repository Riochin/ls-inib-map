'use client'

import { buildCountLabel } from '@/lib/info-display'

interface StoreCountProps {
  total: number
  filtered: number
  isFiltered: boolean
}

export function StoreCount({ total, filtered, isFiltered }: StoreCountProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-bold text-gray-800 tabular-nums">
        {buildCountLabel(total, filtered, isFiltered)}
      </span>
    </div>
  )
}
