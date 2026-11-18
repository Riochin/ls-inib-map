import type { Store, GameTitle, StoreAttributeKey, Provenance } from '@/types/store'
import type { OverridesFile, OverrideEntry } from '@/types/overrides'
import { GAME_TITLES, STORE_ATTRIBUTES, readAttribute } from '@/lib/store-attributes'

/** ゲーム別レコードを重ねる（指定ゲームのみ置換。machineCounts と同パターン）。 */
function mergeByGame<T>(
  current: Partial<Record<GameTitle, T>> | undefined,
  override: Partial<Record<GameTitle, T>>,
): Partial<Record<GameTitle, T>> {
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

  // フィールド個別の出どころ（entry.attributeSources / entry.countSources）を優先し、
  // 無ければエントリ既定の entry.source を使う（1エントリ内で確信度が違う場合に対応）。
  const attrSource = (key: StoreAttributeKey): Provenance => entry.attributeSources?.[key] ?? entry.source
  const countSource = (game: GameTitle): Provenance => entry.countSources?.[game] ?? entry.source

  if (entry.machineCounts) {
    const machineCounts = { ...store.machineCounts }
    const countSources = { ...store.countSources }
    for (const game of GAME_TITLES) {
      const value = entry.machineCounts[game]
      if (typeof value === 'number' && Number.isFinite(value)) {
        machineCounts[game] = value
        countSources[game] = countSource(game)
      }
    }
    next.machineCounts = machineCounts
    next.countSources = countSources
  }

  if (entry.closed !== undefined) next.closed = entry.closed
  if (entry.delisted !== undefined) next.delisted = entry.delisted
  // 補足は運営編集の中立テキスト＝provenance（attributeSources）を持たない単純な上書き
  if (entry.remarks !== undefined) next.remarks = entry.remarks
  if (entry.name !== undefined) next.name = entry.name
  if (entry.address !== undefined) next.address = entry.address
  if (entry.lat !== undefined) next.lat = entry.lat
  if (entry.lng !== undefined) next.lng = entry.lng

  // 位置を手動補正した場合は運営確認済み＝確定とみなし、「おおよその位置」表示を解除する
  if (entry.lat !== undefined || entry.lng !== undefined) next.approximateLocation = false

  // 店舗単位の「情報更新日」を表示に載せる（override の更新日時）
  if (entry.updatedAt !== undefined) next.infoUpdatedAt = entry.updatedAt

  // 店舗属性（レジストリ）を適用し、attributeSources に出どころを記録する。
  // 店単位は代入、ゲーム別はゲーム単位でマージ（指定ゲームのみ置換）。出どころは sourceKey 単位で1つ
  // （ゲーム別フロアは 'floor'、付随フィールドは本体のキーを共有する）。
  const attributeSources = { ...store.attributeSources }
  let hasAttributeUpdate = false
  const target = next as unknown as Record<string, unknown>

  for (const def of STORE_ATTRIBUTES) {
    const value = readAttribute(entry, def)
    if (value === undefined) continue
    if (def.scope === 'game') {
      target[def.key] = mergeByGame(
        readAttribute(store, def) as Partial<Record<GameTitle, unknown>> | undefined,
        value as Partial<Record<GameTitle, unknown>>,
      )
    } else {
      target[def.key] = value
    }
    attributeSources[def.sourceKey] = attrSource(def.sourceKey)
    hasAttributeUpdate = true
  }
  if (hasAttributeUpdate) next.attributeSources = attributeSources

  return next
}
