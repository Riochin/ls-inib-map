import { describe, it, expect } from 'vitest'
import { getMarkerImage, type MarkerThemeKey } from '@/lib/marker-image'

const THEMES: MarkerThemeKey[] = ['both', 'gundamOnly', 'closed', 'delisted']

function decode(url: string): string {
  expect(url.startsWith('data:image/svg+xml,')).toBe(true)
  return decodeURIComponent(url.slice('data:image/svg+xml,'.length))
}

describe('getMarkerImage', () => {
  it('4テーマすべてで data URI 形式のマーカー画像を返す', () => {
    for (const theme of THEMES) {
      const img = getMarkerImage(theme)
      expect(img.url.startsWith('data:image/svg+xml,')).toBe(true)
      expect(img.width).toBeGreaterThan(0)
      expect(img.height).toBeGreaterThan(0)
    }
  })

  it('同一テーマの呼び出しは同一参照を返す（再生成しない）', () => {
    for (const theme of THEMES) {
      expect(getMarkerImage(theme)).toBe(getMarkerImage(theme))
    }
  })

  it('テーマごとに決定論的な data URI を返す', () => {
    for (const theme of THEMES) {
      expect(getMarkerImage(theme).url).toBe(getMarkerImage(theme).url)
    }
  })

  it('both（紫）と gundamOnly（青）は異なる data URI を返す', () => {
    expect(getMarkerImage('both').url).not.toBe(getMarkerImage('gundamOnly').url)
  })

  it('both はテーマの紫グラデ色（#7B2FBE）を含む', () => {
    expect(decode(getMarkerImage('both').url)).toContain('#7B2FBE')
  })

  it('gundamOnly はテーマの青グラデ色（#2563EB）を含む', () => {
    expect(decode(getMarkerImage('gundamOnly').url)).toContain('#2563EB')
  })

  it('closed と delisted はどちらもグレー系（#4B5563）を含む', () => {
    expect(decode(getMarkerImage('closed').url)).toContain('#4B5563')
    expect(decode(getMarkerImage('delisted').url)).toContain('#4B5563')
  })

  it('closed は🌸を埋め込み、delisted は絵文字を埋め込まない', () => {
    expect(decode(getMarkerImage('closed').url)).toContain('🌸')
    expect(decode(getMarkerImage('delisted').url)).not.toContain('🌸')
  })

  it('closed と delisted は同じグレーでも異なる data URI になる（🌸の有無）', () => {
    expect(getMarkerImage('closed').url).not.toBe(getMarkerImage('delisted').url)
  })

  it('SSR 安全：生成された SVG は xmlns 名前空間を含む', () => {
    expect(decode(getMarkerImage('both').url)).toContain('http://www.w3.org/2000/svg')
  })
})
