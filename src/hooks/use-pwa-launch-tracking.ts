'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

type StandaloneDisplayMode = 'standalone' | 'fullscreen' | 'minimal-ui'

const STANDALONE_DISPLAY_MODES: readonly StandaloneDisplayMode[] = [
  'standalone',
  'fullscreen',
  'minimal-ui',
]

/**
 * ホーム画面に追加したアプリ（PWA）として起動されたかを判定する。
 * Android/Desktop は `display-mode` メディアクエリ、iOS Safari は
 * `navigator.standalone`（display-mode 非対応）で判定する。
 */
export function detectPwaDisplayMode(): StandaloneDisplayMode | null {
  if (typeof window === 'undefined') return null

  if (typeof window.matchMedia === 'function') {
    const matched = STANDALONE_DISPLAY_MODES.find(
      (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
    )
    if (matched) return matched
  }

  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return 'standalone'

  return null
}

/**
 * アプリ起動時に一度だけ、PWA(standalone等)からのアクセスかどうかを GA4 へ送信する。
 * `pwa_launch`（{@link GAEventMap.pwa_launch}）。ルートのページコンポーネントで呼ぶ想定。
 */
export function usePwaLaunchTracking(): void {
  useEffect(() => {
    const displayMode = detectPwaDisplayMode()
    if (displayMode) {
      trackEvent('pwa_launch', { display_mode: displayMode })
    }
  }, [])
}
