'use client'

import { formatLastUpdated } from '@/lib/info-display'

interface LastUpdatedProps {
  /** ISO 8601 の最終更新日時。欠落時は何も表示しない（グレースフルデグラデーション） */
  lastUpdated?: string | null
}

export function LastUpdated({ lastUpdated }: LastUpdatedProps) {
  const formatted = lastUpdated ? formatLastUpdated(lastUpdated) : null
  if (!formatted) return null

  return <span className="text-[10px] text-gray-500">更新: {formatted}</span>
}
