import { describe, it, expect } from 'vitest'
import { getMarkerColor, getMarkerTheme, getFilterActiveColor, getGameLabel, getThemeKey, getThemeByKey, getStoreStatusLabel, getMarkerEmoji, getCountSourceInfo } from '@/lib/marker-color'
import type { Store } from '@/types/store'

function makeStore(games: Store['games'], extra: Partial<Store> = {}): Store {
  return { id: 'test', name: 'テスト店舗', address: '東京都', lat: 35.68, lng: 139.77, games, ...extra }
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

  it('閉店店舗は"closed"を返す', () => {
    expect(getThemeKey(makeStore(['jojo-ls', 'gundam-exvs'], { closed: true }))).toBe('closed')
  })

  it('移設可能性店舗は"delisted"を返す', () => {
    expect(getThemeKey(makeStore(['jojo-ls', 'gundam-exvs'], { delisted: true }))).toBe('delisted')
  })

  it('閉店と移設が重なる場合は"closed"を優先する', () => {
    expect(getThemeKey(makeStore(['gundam-exvs'], { closed: true, delisted: true }))).toBe('closed')
  })
})

describe('getMarkerTheme（状態）', () => {
  it('閉店店舗はグレー系テーマを返す', () => {
    const theme = getMarkerTheme(makeStore(['jojo-ls', 'gundam-exvs'], { closed: true }))
    expect(theme.gradientFrom).toBe('#4B5563')
  })

  it('移設可能性店舗はグレー系テーマを返す', () => {
    const theme = getMarkerTheme(makeStore(['jojo-ls', 'gundam-exvs'], { delisted: true }))
    expect(theme.gradientFrom).toBe('#4B5563')
  })
})

describe('getStoreStatusLabel', () => {
  it('閉店店舗は「閉店」を返す', () => {
    expect(getStoreStatusLabel(makeStore(['jojo-ls'], { closed: true }))).toBe('閉店')
  })

  it('移設可能性店舗は「移設？」を返す', () => {
    expect(getStoreStatusLabel(makeStore(['jojo-ls'], { delisted: true }))).toBe('移設？')
  })

  it('閉店が移設より優先される', () => {
    expect(getStoreStatusLabel(makeStore(['jojo-ls'], { closed: true, delisted: true }))).toBe('閉店')
  })

  it('通常店舗はnullを返す', () => {
    expect(getStoreStatusLabel(makeStore(['jojo-ls']))).toBeNull()
  })
})

describe('getMarkerEmoji', () => {
  it('閉店店舗は🌸を返す', () => {
    expect(getMarkerEmoji(makeStore(['jojo-ls'], { closed: true }))).toBe('🌸')
  })

  it('移設可能性店舗は絵文字なし（null）を返す', () => {
    expect(getMarkerEmoji(makeStore(['jojo-ls'], { delisted: true }))).toBeNull()
  })

  it('通常店舗はnullを返す', () => {
    expect(getMarkerEmoji(makeStore(['jojo-ls']))).toBeNull()
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

describe('getGameLabel', () => {
  it('jojo-lsに対して「ラスサバ」を返す', () => {
    expect(getGameLabel('jojo-ls')).toBe('ラスサバ')
  })

  it('gundam-exvsに対して「イニブ」を返す', () => {
    expect(getGameLabel('gundam-exvs')).toBe('イニブ')
  })
})

describe('getCountSourceInfo', () => {
  it('admin（運営確認）のみ確定（confirmed=true）', () => {
    const info = getCountSourceInfo('admin')
    expect(info.confirmed).toBe(true)
    expect(info.label).toContain('運営')
  })

  it('official・未指定は未確認扱い（confirmed=false）', () => {
    expect(getCountSourceInfo('official').confirmed).toBe(false)
    expect(getCountSourceInfo(undefined).confirmed).toBe(false)
    expect(getCountSourceInfo(undefined).label).toContain('公式')
  })

  it('user-report は未確認扱いで「みんなの報告」ラベル', () => {
    const info = getCountSourceInfo('user-report')
    expect(info.confirmed).toBe(false)
    expect(info.label).toContain('みんなの報告')
  })

  it('auto-scrape は未確認扱い', () => {
    expect(getCountSourceInfo('auto-scrape').confirmed).toBe(false)
  })
})
