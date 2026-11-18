import type { GameTitle, Store } from '@/types/store'
import type { OverrideEntry, OverridesFile } from '@/types/overrides'

/**
 * 台数の上書きの基準値（ADR-0009）。
 *
 * 台数の上書きは「公式がこの値のとき、実際はこう」という補正なので、上書きした時点の
 * 公式台数を `countBaselines` に残し、公式の現在値がそれと違えば上書きを使わない。
 * 書き込む側（管理GUIの API・自動反映ワークフロー・CLI）と読む側（applyOverrides・週次の一覧）が
 * 同じ判定を使うよう、ここにまとめる。
 */

const GAME_TITLES: GameTitle[] = ['jojo-ls', 'gundam-exvs']

/** 公式の台数（上書き前）。台数が載っていないゲームは 0。 */
export function officialCount(store: Pick<Store, 'machineCounts'> | undefined, game: GameTitle): number {
  return store?.machineCounts?.[game] ?? 0
}

/**
 * 台数の上書きが古くなったか（公式の現在値が基準値と違うか）。
 * 基準値が無い（移行前のデータ）ときは false＝これまでどおり上書きを使う。
 */
export function isCountOverrideStale(official: number, baseline: number | undefined): boolean {
  return baseline !== undefined && official !== baseline
}

export interface SyncCountBaselinesOptions {
  /** 比較元のファイル。ここから台数が変わった（または新しく足した）ゲームは基準値を今の公式値にする */
  base?: OverridesFile
  /** 台数はそのままで、今の公式値を基準にし直す店舗ID（運営が見直して「この台数で確認した」とき） */
  confirmIds?: Iterable<string>
}

export interface SyncCountBaselinesResult {
  file: OverridesFile
  /** 基準値が変わった店舗ID */
  changedIds: string[]
}

function sameCounts(
  a: Partial<Record<GameTitle, number>> | undefined,
  b: Partial<Record<GameTitle, number>> | undefined,
): boolean {
  return GAME_TITLES.every((g) => a?.[g] === b?.[g])
}

/** `countBaselines` を `machineCounts` の直後に置いた新しいエントリを返す（diff を読みやすくする）。 */
function withBaselines(
  entry: OverrideEntry,
  baselines: Partial<Record<GameTitle, number>> | undefined,
): OverrideEntry {
  const out: Record<string, unknown> = {}
  let placed = false
  for (const [key, value] of Object.entries(entry)) {
    if (key === 'countBaselines') continue
    out[key] = value
    if (key === 'machineCounts' && baselines) {
      out.countBaselines = baselines
      placed = true
    }
  }
  if (baselines && !placed) out.countBaselines = baselines
  return out as unknown as OverrideEntry
}

/**
 * 台数の上書きに基準値を入れる。台数を持つゲームごとに、次のどれかなら今の公式値を入れる。
 *
 * - 基準値がまだ無い
 * - `base` と比べて台数が変わった（新しく足した場合も含む）
 * - `confirmIds` に入っている
 *
 * 台数を消したゲームの基準値は消す。`updatedAt` など他の項目は触らない。
 * `stores` には上書き前の公式データ（`stores.json`）を渡す。店舗が見つからない ID は触らない
 * （ID 不一致は validate-overrides が別に止める）。
 */
export function syncCountBaselines(
  file: OverridesFile,
  stores: Pick<Store, 'id' | 'machineCounts'>[],
  options: SyncCountBaselinesOptions = {},
): SyncCountBaselinesResult {
  const storeById = new Map(stores.map((s) => [s.id, s]))
  const confirm = new Set(options.confirmIds ?? [])
  const changedIds: string[] = []
  const overrides: Record<string, OverrideEntry> = {}

  for (const [id, entry] of Object.entries(file.overrides)) {
    const store = storeById.get(id)
    if (!store) {
      overrides[id] = entry
      continue
    }

    const baseCounts = options.base?.overrides[id]?.machineCounts
    const baselines: Partial<Record<GameTitle, number>> = {}
    for (const game of GAME_TITLES) {
      const count = entry.machineCounts?.[game]
      if (typeof count !== 'number') continue
      const current = entry.countBaselines?.[game]
      const countChanged = options.base !== undefined && baseCounts?.[game] !== count
      baselines[game] =
        current === undefined || countChanged || confirm.has(id) ? officialCount(store, game) : current
    }

    const next = Object.keys(baselines).length > 0 ? baselines : undefined
    if (sameCounts(next, entry.countBaselines) && (next !== undefined) === (entry.countBaselines !== undefined)) {
      overrides[id] = entry
      continue
    }
    overrides[id] = withBaselines(entry, next)
    changedIds.push(id)
  }

  return { file: { overrides }, changedIds }
}

/** 台数の上書きに基準値が無いゲーム（書き込み経路の入れ忘れ）。validate-overrides が使う。 */
export function listMissingCountBaselines(file: OverridesFile): { id: string; game: GameTitle }[] {
  const missing: { id: string; game: GameTitle }[] = []
  for (const [id, entry] of Object.entries(file.overrides)) {
    for (const game of GAME_TITLES) {
      if (typeof entry.machineCounts?.[game] === 'number' && entry.countBaselines?.[game] === undefined) {
        missing.push({ id, game })
      }
    }
  }
  return missing
}

export interface StaleCountOverride {
  id: string
  name: string
  game: GameTitle
  /** 上書きした時点の公式台数 */
  baseline: number
  /** 今の公式台数（0＝公式に台数なし） */
  official: number
  /** 上書きの台数（今は使われていない） */
  override: number
}

/** 公式の台数が基準値から変わったため、使われなくなった台数の上書きの一覧（ID・ゲーム順）。 */
export function listStaleCountOverrides(
  stores: Pick<Store, 'id' | 'name' | 'machineCounts'>[],
  file: OverridesFile,
): StaleCountOverride[] {
  const storeById = new Map(stores.map((s) => [s.id, s]))
  const stale: StaleCountOverride[] = []
  for (const id of Object.keys(file.overrides).sort()) {
    const entry = file.overrides[id]
    const store = storeById.get(id)
    if (!store) continue
    for (const game of GAME_TITLES) {
      const override = entry.machineCounts?.[game]
      const baseline = entry.countBaselines?.[game]
      if (typeof override !== 'number' || baseline === undefined) continue
      const official = officialCount(store, game)
      if (isCountOverrideStale(official, baseline)) {
        stale.push({ id, name: entry.name ?? store.name, game, baseline, official, override })
      }
    }
  }
  return stale
}
