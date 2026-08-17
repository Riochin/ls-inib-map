'use client'

import { useState, useCallback } from 'react'
import { trackEvent } from '@/lib/analytics'

interface LocateButtonProps {
  isLocating: boolean
  error: string | null
  onLocate: () => void
}

export function LocateButton({ isLocating, error, onLocate }: LocateButtonProps) {
  // error が変わるたびに dismissal をレンダー中にリセット（React 公式の前回値比較パターン）。
  // これで同一エラーの連続発生でもメッセージを再表示でき、effect 内の同期 setState を避けられる。
  const [dismissed, setDismissed] = useState(false)
  // 閉じる収縮アニメ中フラグ。アニメ終了まで窓を描画し続け、終わってから丸ボタンへ差し替える。
  const [closing, setClosing] = useState(false)
  const [prevError, setPrevError] = useState(error)
  if (error !== prevError) {
    setPrevError(error)
    setDismissed(false)
    setClosing(false)
  }
  const showError = error !== null && !dismissed

  // 現在地ボタン押下を計測してから位置取得を実行。再レンダーごとの関数再生成を避けてメモ化。
  const handleLocate = useCallback(() => {
    trackEvent('click_geolocation_search')
    onLocate()
  }, [onLocate])

  return (
    <div className="absolute bottom-6 left-4 z-10">
      {showError && error ? (
        // エラー時は丸ボタンがそのまま横に伸びてメッセージ窓に変身する（max-width を展開）。
        // コンパスアイコンは左に据え置き、閉じる「<」で丸ボタンへ畳む。閉じるまで位置取得は不可。
        // 外側で overflow-hidden + max-width アニメ、内側は固定幅でテキストの折返しを安定させる。
        <div
          role="alert"
          className={`overflow-hidden rounded-full shadow-lg bg-white/95 backdrop-blur-sm max-w-[280px] ${closing ? 'animate-locate-collapse' : 'animate-locate-expand'}`}
          onAnimationEnd={() => {
            // 収縮アニメ終了時のみ丸ボタンへ差し替え（展開アニメ終了では何もしない）
            if (closing) {
              setDismissed(true)
              setClosing(false)
            }
          }}
        >
          <div className="flex items-center gap-2 min-h-14 w-[280px] pl-4 pr-1.5 py-2">
            <svg className="w-7 h-7 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
            </svg>
            <span className="flex-1 text-gray-700 text-xs leading-snug">{error}</span>
            <button
              onClick={() => setClosing(true)}
              aria-label="閉じる"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white active:bg-gray-100 disabled:opacity-50 transition-colors"
          aria-label="現在位置を取得"
        >
          {isLocating ? (
            <svg className="w-7 h-7 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
