'use client'

import type { Store } from '@/types/store'
import { StoreDetailPanel } from './StoreDetailPanel'

interface StoreDetailModalProps {
  store: Store
  onClose: () => void
  onOpenInfoForm: () => void
}

/**
 * 店舗詳細モーダル。
 * - モバイル（md: 未満）: 画面下部から展開するボトムシート
 * - PC（md: 以上）: 画面中央のモーダル
 * - オーバーレイクリックで閉じる
 */
export function StoreDetailModal({ store, onClose, onOpenInfoForm }: StoreDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] md:flex md:items-center md:justify-center"
      onClick={onClose}
    >
      {/* モバイル: ボトムシート / PC: 中央モーダル */}
      <div
        className="fixed bottom-0 inset-x-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white shadow-xl md:static md:inset-auto md:max-h-[90vh] md:w-full md:max-w-lg md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <StoreDetailPanel store={store} onOpenInfoForm={onOpenInfoForm} onClose={onClose} />
      </div>
    </div>
  )
}
