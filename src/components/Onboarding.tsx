'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ls-exvs-onboarded'

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '🎮', title: 'タイトルで絞り込み', desc: '画面上部のボタンでラスサバ／イニブを切り替えできます。' },
  { icon: '🔍', title: '店舗を検索', desc: '右上の検索ボタンから店舗名で探せます。選ぶと地図が移動します。' },
  { icon: '📍', title: 'エリアと現在地', desc: '左下のボタンで都道府県・市区町村の絞り込みや現在地への移動ができます。' },
  { icon: '🟣', title: 'ピンの色', desc: '紫=両タイトル / 青=イニブのみ / グレー🌸=閉店 / グレー=移設の可能性。' },
]

function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="absolute top-20 right-4 z-10">
      <button
        onClick={onClick}
        className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white active:bg-gray-100 transition-colors text-gray-700 text-xl font-bold"
        aria-label="操作案内を表示"
      >
        ?
      </button>
    </div>
  )
}

function OnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="閉じる"
        >
          ✕
        </button>
        <h2 className="text-base font-bold text-gray-800 mb-3">使い方</h2>
        <ul className="flex flex-col gap-3">
          {STEPS.map((step) => (
            <li key={step.title} className="flex gap-3 items-start">
              <span className="text-xl leading-none mt-0.5">{step.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                <p className="text-xs text-gray-600 leading-snug">{step.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
        >
          はじめる
        </button>
      </div>
    </div>
  )
}

export function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)

  // localStorage 参照は副作用フェーズ限定（SSR/hydration安全・ちらつき防止・Req6.2）
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setIsOpen(true)
    } catch {
      // localStorage 不可（プライベートモード等）の場合は自動表示しない
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // 永続化できなくても表示自体は閉じる
    }
  }

  return (
    <>
      <HelpButton onClick={() => setIsOpen(true)} />
      {isOpen && <OnboardingModal onClose={handleClose} />}
    </>
  )
}
