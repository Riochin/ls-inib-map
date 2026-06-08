'use client'

import { buildCountLabel, formatCoverageRate } from '@/lib/info-display'

interface StoreCountProps {
  total: number
  filtered: number
  isFiltered: boolean
  /** 公式が公表する設置店舗総数（網羅率表示用・任意・Req4.3） */
  officialTotal?: number
}

export function StoreCount({ total, filtered, isFiltered, officialTotal }: StoreCountProps) {
  const rate = officialTotal != null ? formatCoverageRate(total, officialTotal) : null

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-bold text-gray-800 tabular-nums">
        {buildCountLabel(total, filtered, isFiltered)}
      </span>
      {rate != null && (
        <span className="text-[10px] text-gray-500 tabular-nums">
          公式{officialTotal}件中 {rate}%
        </span>
      )}
    </div>
  )
}
