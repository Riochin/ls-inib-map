import { describe, it, expect } from 'vitest'
import { getMarkerColor, getMarkerTheme, getFilterActiveColor, getGameLabel, getThemeKey, getThemeByKey, GRADIENT_DEFS } from '@/lib/marker-color'
import type { Store } from '@/types/store'

function makeStore(games: Store['games']): Store {
  return { id: 'test', name: 'テスト店舗', address: '東京都', lat: 35.68, lng: 139.77, games }
}

describe('getMarkerTheme', () => {
  it('両タイトル稼働店舗は紫系テーマを返す', () => {
    const theme = getMarkerTheme(makeStore(['jojo-ls', 'gundam-exvs']))
    expect(theme.gradientFrom).toBe('#7B2FBE')
    expect(theme.gradientTo).toBe('#C4A0E8')
    expect(theme.badgeBg).toBe('#7B2FBE')
  })

  it('イニブのみ稼働店舗は青系テーマを返す', () => {
    const theme = getMarkerTheme(makeStore(['gundam-exvs']))
    expect(theme.gradientFrom).toBe('#2563EB')
    expect(theme.gradientTo).toBe('#DBEAFE')
    expect(theme.badgeBg).toBe('#2563EB')
  })

  it('ラスサバのみ稼働店舗は紫系テーマを返す', () => {
    const theme = getMarkerTheme(makeStore(['jojo-ls']))
    expect(theme.gradientFrom).toBe('#7B2FBE')
    expect(theme.gradientTo).toBe('#C4A0E8')
  })
})

describe('getMarkerColor', () => {
  it('両タイトル稼働店舗は紫の主色を返す', () => {
    expect(getMarkerColor(makeStore(['jojo-ls', 'gundam-exvs']))).toBe('#7B2FBE')
  })

  it('イニブのみ稼働店舗は青の主色を返す', () => {
    expect(getMarkerColor(makeStore(['gundam-exvs']))).toBe('#2563EB')
  })

  it('ラスサバのみ稼働店舗は紫の主色を返す', () => {
    expect(getMarkerColor(makeStore(['jojo-ls']))).toBe('#7B2FBE')
  })
})

describe('getFilterActiveColor', () => {
  it('「すべて」はグレー系を返す', () => {
    const color = getFilterActiveColor('all')
    expect(color.bg).toBe('bg-gray-900')
    expect(color.text).toBe('text-white')
  })

  it('「ラスサバ」は紫系を返す', () => {
    const color = getFilterActiveColor('jojo-ls')
    expect(color.bg).toBe('bg-purple-700')
    expect(color.text).toBe('text-white')
  })

  it('「イニブ」は青系を返す', () => {
    const color = getFilterActiveColor('gundam-exvs')
    expect(color.bg).toBe('bg-blue-600')
    expect(color.text).toBe('text-white')
  })
})

describe('getThemeKey', () => {
  it('両タイトル稼働店舗は"both"を返す', () => {
    expect(getThemeKey(makeStore(['jojo-ls', 'gundam-exvs']))).toBe('both')
  })

  it('ラスサバのみ稼働店舗は"both"を返す', () => {
    expect(getThemeKey(makeStore(['jojo-ls']))).toBe('both')
  })

  it('イニブのみ稼働店舗は"gundamOnly"を返す', () => {
    expect(getThemeKey(makeStore(['gundam-exvs']))).toBe('gundamOnly')
  })
})

describe('getThemeByKey', () => {
  it('"both"キーで紫系テーマを返す', () => {
    const theme = getThemeByKey('both')
    expect(theme.gradientFrom).toBe('#7B2FBE')
  })

  it('"gundamOnly"キーで青系テーマを返す', () => {
    const theme = getThemeByKey('gundamOnly')
    expect(theme.gradientFrom).toBe('#2563EB')
  })
})

describe('GRADIENT_DEFS', () => {
  it('2つのグラデーション定義を含む', () => {
    expect(GRADIENT_DEFS).toHaveLength(2)
  })

  it('bothとgundamOnlyのIDを持つ', () => {
    const ids = GRADIENT_DEFS.map((d) => d.id)
    expect(ids).toContain('both')
    expect(ids).toContain('gundamOnly')
  })

  it('各定義にfromとtoの色を持つ', () => {
    for (const def of GRADIENT_DEFS) {
      expect(def.from).toMatch(/^#/)
      expect(def.to).toMatch(/^#/)
    }
  })
})

describe('getGameLabel', () => {
  it('jojo-lsに対して「ラスサバ」を返す', () => {
    expect(getGameLabel('jojo-ls')).toBe('ラスサバ')
  })

  it('gundam-exvsに対して「イニブ」を返す', () => {
    expect(getGameLabel('gundam-exvs')).toBe('イニブ')
  })
})
