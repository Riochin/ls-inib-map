import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectPwaDisplayMode } from '@/hooks/use-pwa-launch-tracking'

function stubMatchMedia(matchedMode: string | null) {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: matchedMode !== null && query === `(display-mode: ${matchedMode})`,
    }),
    navigator: {},
  })
}

describe('detectPwaDisplayMode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('window 不在（SSR）では null', () => {
    expect(detectPwaDisplayMode()).toBeNull()
  })

  it('display-mode: standalone に一致すれば standalone を返す', () => {
    stubMatchMedia('standalone')
    expect(detectPwaDisplayMode()).toBe('standalone')
  })

  it('display-mode: fullscreen に一致すれば fullscreen を返す', () => {
    stubMatchMedia('fullscreen')
    expect(detectPwaDisplayMode()).toBe('fullscreen')
  })

  it('通常ブラウザ表示（どの display-mode にも一致しない）では null', () => {
    stubMatchMedia(null)
    expect(detectPwaDisplayMode()).toBeNull()
  })

  it('matchMedia 非対応でも navigator.standalone（iOS Safari）が true なら standalone を返す', () => {
    vi.stubGlobal('window', { navigator: { standalone: true } })
    expect(detectPwaDisplayMode()).toBe('standalone')
  })
})
