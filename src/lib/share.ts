import type { Store } from '@/types/store'
import { getGameLabel } from '@/lib/marker-color'

export function buildShareText(store: Store): string {
  const lines: string[] = [`${store.name}（${store.address}）`]
  if (store.businessHours) {
    lines.push(`営業時間: ${store.businessHours}`)
  }
  const counts = store.games
    .map((g) => {
      const n = store.machineCounts?.[g]
      return n != null ? `${getGameLabel(g)} ${n}台` : null
    })
    .filter(Boolean)
  if (counts.length > 0) {
    lines.push(counts.join(' / '))
  }
  return lines.join('\n')
}
