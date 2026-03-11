import type { Store } from '@/types/store'

const COLORS = {
  jojoOnly: '#7B2FBE',
  gundamOnly: '#2E8B57',
  both: '#FF8C00',
} as const

export function getMarkerColor(store: Store): string {
  const hasJojo = store.games.includes('jojo-ls')
  const hasGundam = store.games.includes('gundam-exvs')
  if (hasJojo && hasGundam) return COLORS.both
  if (hasJojo) return COLORS.jojoOnly
  return COLORS.gundamOnly
}

export function getGameLabel(game: 'jojo-ls' | 'gundam-exvs'): string {
  return game === 'jojo-ls' ? 'ラスサバ' : 'イニブ'
}
