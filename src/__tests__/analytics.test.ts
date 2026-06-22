import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// sendGAEvent は実体を呼ばずモックして、引数だけ検証する。
const sendGAEvent = vi.fn()
vi.mock('@next/third-parties/google', () => ({
  sendGAEvent: (...args: unknown[]) => sendGAEvent(...args),
}))

import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
  beforeEach(() => {
    sendGAEvent.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('window 不在（SSR/ビルド時）では送信しない', () => {
    // 既定の vitest 環境は node のため window は未定義
    vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TEST')
    trackEvent('filter_title', { filter: 'all' })
    expect(sendGAEvent).not.toHaveBeenCalled()
  })

  it('NEXT_PUBLIC_GA_ID 未設定では送信しない（no-op）', () => {
    vi.stubGlobal('window', {})
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '')
    trackEvent('filter_title', { filter: 'all' })
    expect(sendGAEvent).not.toHaveBeenCalled()
  })

  it('window あり＋GA_ID 設定時は event 名・パラメータ付きで送信する', () => {
    vi.stubGlobal('window', {})
    vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TEST')
    trackEvent('view_store_detail', { store_id: 'abc', source: 'marker' })
    expect(sendGAEvent).toHaveBeenCalledTimes(1)
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'view_store_detail', {
      store_id: 'abc',
      source: 'marker',
    })
  })

  it('パラメータ無しイベントは空オブジェクトで送信する', () => {
    vi.stubGlobal('window', {})
    vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TEST')
    trackEvent('click_geolocation_search')
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'click_geolocation_search', {})
  })
})
