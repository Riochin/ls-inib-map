'use client'

import { useState } from 'react'
import { FeedbackForm } from '@/components/FeedbackForm'

/**
 * `/about`（Server Component）から要望フォームを開くためのクライアント小島。
 *
 * フォーム本体（{@link FeedbackForm}・'use client'）の開閉 state を持つだけの薄いラッパー。
 * オンボーディングの `onOpenFeedback` → `setFeedbackOpen` パターン（Onboarding.tsx）を縮小移植したもの。
 */
export function AboutFeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 rounded-full text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
      >
        要望フォームを開く
      </button>
      {open && <FeedbackForm onClose={() => setOpen(false)} />}
    </>
  )
}
