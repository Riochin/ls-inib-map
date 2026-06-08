import type { Store } from '@/types/store'
import type { FilterOption } from '@/types/store'

export interface ColorTheme {
  gradientFrom: string
  gradientTo: string
  badgeBg: string
  badgeText: string
  filterActiveBg: string
  filterActiveText: string
}

const THEMES = {
  both: {
    gradientFrom: '#7B2FBE',
    gradientTo: '#C4A0E8',
    badgeBg: '#7B2FBE',
    badgeText: '#FFFFFF',
    filterActiveBg: 'bg-purple-700',
    filterActiveText: 'text-white',
  },
  gundamOnly: {
    gradientFrom: '#2563EB',
    gradientTo: '#DBEAFE',
    badgeBg: '#2563EB',
    badgeText: '#FFFFFF',
    filterActiveBg: 'bg-blue-600',
    filterActiveText: 'text-white',
  },
  closed: {
    gradientFrom: '#4B5563',
    gradientTo: '#9CA3AF',
    badgeBg: '#4B5563',
    badgeText: '#FFFFFF',
    filterActiveBg: 'bg-gray-400',
    filterActiveText: 'text-white',
  },
  // 移設可能性（公式一覧から消失・自動検出）。閉店と同じグレー系だが、絵文字なしの無装飾ピン。
  delisted: {
    gradientFrom: '#4B5563',
    gradientTo: '#9CA3AF',
    badgeBg: '#4B5563',
    badgeText: '#FFFFFF',
    filterActiveBg: 'bg-gray-400',
    filterActiveText: 'text-white',
  },
} as const satisfies Record<string, ColorTheme>

export function getMarkerTheme(store: Store): ColorTheme {
  return getThemeByKey(getThemeKey(store))
}

export type ThemeKey = 'both' | 'gundamOnly' | 'closed' | 'delisted'

// 表示優先: closed（🌸）> delisted（移設？・グレー）> ゲーム別色
export function getThemeKey(store: Store): ThemeKey {
  if (store.closed) return 'closed'
  if (store.delisted) return 'delisted'
  const hasJojo = store.games.includes('jojo-ls')
  return hasJojo ? 'both' : 'gundamOnly'
}

export function getThemeByKey(key: ThemeKey): ColorTheme {
  return THEMES[key]
}

/** 店舗の状態ラベル（閉店 / 移設？）。通常店舗は null。 */
export function getStoreStatusLabel(store: Store): string | null {
  if (store.closed) return '閉店'
  if (store.delisted) return '移設？'
  return null
}

/** マーカー上に重畳する絵文字。閉店は🌸、移設・通常は絵文字なし（null）。 */
export function getMarkerEmoji(store: Store): string | null {
  if (store.closed) return '🌸'
  return null
}

export const GRADIENT_DEFS: { id: ThemeKey; from: string; to: string }[] = [
  { id: 'both', from: THEMES.both.gradientFrom, to: THEMES.both.gradientTo },
  { id: 'gundamOnly', from: THEMES.gundamOnly.gradientFrom, to: THEMES.gundamOnly.gradientTo },
  { id: 'closed', from: THEMES.closed.gradientFrom, to: THEMES.closed.gradientTo },
  { id: 'delisted', from: THEMES.delisted.gradientFrom, to: THEMES.delisted.gradientTo },
]

export function getMarkerColor(store: Store): string {
  return getMarkerTheme(store).gradientFrom
}

export function getFilterActiveColor(filter: FilterOption): { bg: string; text: string } {
  switch (filter) {
    case 'jojo-ls':
      return { bg: THEMES.both.filterActiveBg, text: THEMES.both.filterActiveText }
    case 'gundam-exvs':
      return { bg: THEMES.gundamOnly.filterActiveBg, text: THEMES.gundamOnly.filterActiveText }
    default:
      return { bg: 'bg-gray-900', text: 'text-white' }
  }
}

export function getGameLabel(game: 'jojo-ls' | 'gundam-exvs'): string {
  return game === 'jojo-ls' ? 'ラスサバ' : 'イニブ'
}
