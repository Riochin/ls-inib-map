import type { Store, GameTitle, StoreAttributeKey, TernaryState } from '@/types/store'
import type { OverridesFile, OverrideEntry } from '@/types/overrides'

const GAME_TITLES: GameTitle[] = ['jojo-ls', 'gundam-exvs']

// 単純値の属性キー（entry[key] をそのまま写すもの）。録画台/配信台は
// ゲーム別（ByGame）でマージが必要なため、ここには含めず個別に処理する。
const ATTRIBUTE_KEYS: StoreAttributeKey[] = [
  'businessHours',
  'floor',
  'smoking',
  'payments',
  'officialUrl',
]

/** ゲーム別の三値レコードを重ねる（指定ゲームのみ置換。machineCounts と同パターン）。 */
function mergeByGame(
  current: Partial<Record<GameTitle, TernaryState>> | undefined,
  override: Partial<Record<GameTitle, TernaryState>>,
): Partial<Record<GameTitle, TernaryState>> {
  const merged = { ...current }
  for (const game of GAME_TITLES) {
    const value = override[game]
    if (value !== undefined) merged[game] = value
  }
  return merged
}

/**
 * 公式スクレイプ由来の店舗一覧に、手動オーバーライド（overrides.json）を重ねる。
 *
 * - 店舗ID一致で {@link OverrideEntry} を適用し、上書きしたゲーム台数の出どころを
 *   `countSources` に記録する（表示側がユーザー報告/未確認の見た目を出すため）。
 * - 入力は破壊せず、変更があった店舗のみ新オブジェクトを返す（read-only 構成を維持）。
 * - どの店舗にも当たらない override ID は陳腐化の可能性として `console.warn` する。
 *
 * `stores.json` の生成パイプラインとは独立し、ローダ（`@/data/stores`）と
 * GUI/CLI から共有されるランタイム純関数。
 */
export function applyOverrides(stores: Store[], file: OverridesFile): Store[] {
  const overrides = file?.overrides ?? {}
  const ids = Object.keys(overrides)
  if (ids.length === 0) return stores

  const matched = new Set<string>()
  const result = stores.map((store) => {
    const entry = overrides[store.id]
    if (!entry) return store
    matched.add(store.id)
    return applyEntry(store, entry)
  })

  for (const id of ids) {
    if (!matched.has(id)) {
      const note = overrides[id]?.note
      console.warn(
        `[overrides] 店舗ID "${id}" に一致する店舗がありません` +
          `（店名/住所変更でIDが変わった可能性）${note ? `: ${note}` : ''}`,
      )
    }
  }

  return result
}

/** 1店舗に OverrideEntry を適用した新しい Store を返す（入力非破壊）。 */
function applyEntry(store: Store, entry: OverrideEntry): Store {
  const next: Store = { ...store }

  if (entry.machineCounts) {
    const machineCounts = { ...store.machineCounts }
    const countSources = { ...store.countSources }
    for (const game of GAME_TITLES) {
      const value = entry.machineCounts[game]
      if (typeof value === 'number' && Number.isFinite(value)) {
        machineCounts[game] = value
        countSources[game] = entry.source
      }
    }
    next.machineCounts = machineCounts
    next.countSources = countSources
  }

  if (entry.closed !== undefined) next.closed = entry.closed
  if (entry.delisted !== undefined) next.delisted = entry.delisted
  if (entry.name !== undefined) next.name = entry.name
  if (entry.address !== undefined) next.address = entry.address
  if (entry.lat !== undefined) next.lat = entry.lat
  if (entry.lng !== undefined) next.lng = entry.lng

  // 位置を手動補正した場合は運営確認済み＝確定とみなし、「おおよその位置」表示を解除する
  if (entry.lat !== undefined || entry.lng !== undefined) next.approximateLocation = false

  // 店舗単位の「情報更新日」を表示に載せる（override の更新日時）
  if (entry.updatedAt !== undefined) next.infoUpdatedAt = entry.updatedAt

  // 新拡張属性を適用し、attributeSources に出どころを記録する
  const attributeSources = { ...store.attributeSources }
  let hasAttributeUpdate = false

  // ゲーム別の録画台/配信台はゲーム単位でマージ（provenance は機能単位で1つ）
  if (entry.hasRecordingByGame) {
    next.hasRecordingByGame = mergeByGame(store.hasRecordingByGame, entry.hasRecordingByGame)
    attributeSources.hasRecordingByGame = entry.source
    hasAttributeUpdate = true
  }
  if (entry.hasStreamingByGame) {
    next.hasStreamingByGame = mergeByGame(store.hasStreamingByGame, entry.hasStreamingByGame)
    attributeSources.hasStreamingByGame = entry.source
    hasAttributeUpdate = true
  }

  for (const key of ATTRIBUTE_KEYS) {
    const value = entry[key]
    if (value !== undefined) {
      ;(next as unknown as Record<string, unknown>)[key] = value
      attributeSources[key] = entry.source
      hasAttributeUpdate = true
    }
  }
  if (hasAttributeUpdate) next.attributeSources = attributeSources

  return next
}
