import type { Store, FacilityFilter, GameTitle, TernaryState } from '@/types/store'

/** machineCounts の合計台数（未設定キーは 0、machineCounts 自体が無ければ 0）。 */
export function totalMachineCount(store: Store): number {
  if (!store.machineCounts) return 0
  return Object.values(store.machineCounts).reduce((sum, n) => sum + (n ?? 0), 0)
}

/** いずれかのゲームの三値設備が 'yes' なら true（unknown/no/未設定は false）。 */
function hasAnyYes(byGame?: Partial<Record<GameTitle, TernaryState>>): boolean {
  if (!byGame) return false
  return Object.values(byGame).some((v) => v === 'yes')
}

/**
 * 設備・条件フィルタを適用する。各条件は AND 結合。
 * 「あり」系は確定 'yes' のみ通過（unknown/未設定は除外）。
 * 「営業中」は closed/delisted を除外するのみで時刻判定はしない。
 */
export function filterStoresByFacility(stores: Store[], facility: FacilityFilter): Store[] {
  return stores.filter((store) => {
    if (facility.minMachines !== null && totalMachineCount(store) < facility.minMachines) return false
    if (facility.hasStreaming && !hasAnyYes(store.hasStreamingByGame)) return false
    if (facility.hasRecording && !hasAnyYes(store.hasRecordingByGame)) return false
    if (facility.hasSmoking && store.smoking !== 'yes') return false
    if (facility.openOnly && (store.closed === true || store.delisted === true)) return false
    return true
  })
}
