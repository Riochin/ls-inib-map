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
} as const satisfies Record<string, ColorTheme>

export function getMarkerTheme(store: Store): ColorTheme {
  const hasJojo = store.games.includes('jojo-ls')
  const hasGundam = store.games.includes('gundam-exvs')
  if (hasJojo && hasGundam) return THEMES.both
  if (hasJojo) return THEMES.both
  return THEMES.gundamOnly
}

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
