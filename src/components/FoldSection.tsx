'use client'

import { useId, useState, type ReactNode } from 'react'

/**
 * 提供フォームの折りたたみ枠（ADR-0004）。記入率の低い項目（決済・店のサービス）をたたむ。
 *
 * 見出しにタイトル・登録済みバッジ・中身の要約・開閉矢印を並べ、押すと本文を開閉する。
 * 矢印と要約の見た目は絞り込み画面のアコーディオン（`AddressFilterModal` の
 * `renderAccordionHeader`）にそろえる。初期は閉じる。開閉状態は保存しない（報告は1回きりの操作）。
 */
export function FoldSection({
  title,
  summary,
  badge,
  children,
}: {
  title: string
  /** たたんだ見出しの右に出す中身の要約。空なら「未入力」 */
  summary: string
  /** タイトルの右に添えるバッジ（登録済み） */
  badge?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  return (
    <div className="border border-gray-200 rounded-[10px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full flex items-center gap-1.5 px-3 py-2.5 text-left text-[13px] font-semibold text-gray-700"
      >
        <span className="shrink-0">{title}</span>
        {badge && <span className="shrink-0 whitespace-nowrap">{badge}</span>}
        <span
          className={`ml-auto min-w-0 truncate text-xs font-normal ${summary ? 'text-gray-700' : 'text-gray-400'}`}
        >
          {summary || '未入力'}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div id={bodyId} hidden={!open} className="px-3 pb-3 pt-0.5">
        {children}
      </div>
    </div>
  )
}
