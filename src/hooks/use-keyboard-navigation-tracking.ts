'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

/** Tab キー押下かどうかの判定（テスト用に分離した純関数）。 */
export function isFirstTabKeydown(e: Pick<KeyboardEvent, 'key'>): boolean {
  return e.key === 'Tab'
}

/**
 * マウント中に初めて Tab キーが押されたら、キーボード操作ユーザーとして一度だけ
 * GA4 へ送信する。`keyboard_navigation_used`（{@link GAEventMap.keyboard_navigation_used}）。
 * マウス操作が大半の中でキーボード操作ニーズの有無・規模を把握する目的。
 * ルートのページコンポーネントで呼ぶ想定（usePwaLaunchTracking と同様）。
 */
export function useKeyboardNavigationTracking(): void {
  const firedRef = useRef(false)

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (firedRef.current || !isFirstTabKeydown(e)) return
      firedRef.current = true
      trackEvent('keyboard_navigation_used')
      window.removeEventListener('keydown', handleKeydown)
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])
}
