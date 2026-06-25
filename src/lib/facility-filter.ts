import type { Store, FacilityFilter, GameTitle, TernaryState, FilterOption } from '@/types/store'

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

/** 選択ゲームの台数。'all' は全ゲーム合算、特定ゲームはそのキーのみ（未設定 0）。 */
function machineCountForGame(store: Store, game: FilterOption): number {
  if (game === 'all') return totalMachineCount(store)
  return store.machineCounts?.[game] ?? 0
}

/** 選択ゲームの三値設備が 'yes' か。'all' はいずれかのゲームが 'yes'（従来 hasAnyYes）。 */
function hasYesForGame(
  byGame: Partial<Record<GameTitle, TernaryState>> | undefined,
  game: FilterOption,
): boolean {
  if (game === 'all') return hasAnyYes(byGame)
  return byGame?.[game] === 'yes'
}

/**
 * 設備・条件フィルタを適用する。各条件は AND 結合。
 * 台数・録画台・配信台は選択中ゲーム（`game`）でスコープする。'all' は全ゲーム
 * 横断（合算／いずれかが 'yes'）で判定し、特定タイトル選択時はそのゲームのみで判定する。
 * 喫煙所・営業中は店舗単位の属性のためゲーム非依存。
 * 「あり」系は確定 'yes' のみ通過（unknown/未設定は除外）。
 * 「営業中」は closed/delisted を除外するのみで時刻判定はしない。
 */
export function filterStoresByFacility(
  stores: Store[],
  facility: FacilityFilter,
  game: FilterOption,
): Store[] {
  return stores.filter((store) => {
    if (facility.minMachines !== null && machineCountForGame(store, game) < facility.minMachines)
      return false
    if (facility.hasStreaming && !hasYesForGame(store.hasStreamingByGame, game)) return false
    if (facility.hasRecording && !hasYesForGame(store.hasRecordingByGame, game)) return false
    if (facility.hasSmoking && store.smoking !== 'yes') return false
    if (facility.openOnly && (store.closed === true || store.delisted === true)) return false
    return true
  })
}
