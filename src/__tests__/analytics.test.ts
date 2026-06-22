import { describe, it, expect, vi, afterEach } from 'vitest'
import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('window 不在（SSR/ビルド時）でも例外を投げず何もしない', () => {
    // 既定の vitest 環境は node のため window は未定義
    expect(() => trackEvent('filter_title', { filter: 'all' })).not.toThrow()
  })

  it('window.gtag 未ロード時は送信しない（no-op）', () => {
    vi.stubGlobal('window', {}) // gtag なし
    expect(() => trackEvent('filter_title', { filter: 'all' })).not.toThrow()
  })

  it('window.gtag があれば event 名・パラメータ付きで gtag を呼ぶ', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    trackEvent('view_store_detail', { store_id: 'abc', source: 'marker' })
    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenCalledWith('event', 'view_store_detail', {
      store_id: 'abc',
      source: 'marker',
    })
  })

  it('パラメータ無しイベントは空オブジェクトで送る', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    trackEvent('click_geolocation_search')
    expect(gtag).toHaveBeenCalledWith('event', 'click_geolocation_search', {})
  })
})
