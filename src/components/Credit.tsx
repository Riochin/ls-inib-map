'use client'

import { DEFAULT_DATA_SOURCE } from '@/lib/info-display'
import type { StoresMeta } from '@/types/stores-file'

interface CreditProps {
  /** データ出典URL。欠落時は既定の公式2サイトURLを用いる（クレジットは常設・Req6.4） */
  source?: StoresMeta['source']
}

export function Credit({ source = DEFAULT_DATA_SOURCE }: CreditProps) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[10px] text-gray-500 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 shadow whitespace-nowrap">
      データ出典:{' '}
      <a
        href={source.jojols}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        ラスサバ公式
      </a>
      {' / '}
      <a
        href={source.gundam}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        イニブ公式
      </a>
    </div>
  )
}
