import type { Store, CompletenessLevel } from '@/types/store'
import {
  COMPLETENESS_GROUPS,
  STORE_ATTRIBUTES,
  hasAttributeValue,
  readAttribute,
  type AttributeDef,
} from '@/lib/store-attributes'

export interface CompletenessResult {
  filled: number
  total: number
}

/** rich（充実）と判定する埋まり項目数の下限。 */
export const RICH_THRESHOLD = 5
/** poor（不足）と判定する埋まり項目数の上限。 */
export const POOR_THRESHOLD = 2

/**
 * 情報の充実度スコアを算出する。ユーザーにとって価値のある任意情報7項目の
 * 埋まり数を数える（運用フラグ closed/delisted 等は対象外）。
 * 項目は属性レジストリの `completeness` グループ（同じグループはまとめて1項目。
 * 例: 録画台・配信台は「台の設備」1項目）と、レジストリ外の台数。
 */
export function computeCompleteness(store: Store): CompletenessResult {
  const checks: boolean[] = [
    ...COMPLETENESS_GROUPS.map((group) =>
      (STORE_ATTRIBUTES as readonly AttributeDef[]).some(
        (def) => def.completeness === group && hasAttributeValue(def, readAttribute(store, def)),
      ),
    ),
    hasAnyValue(store.machineCounts),
  ]
  return { filled: checks.filter(Boolean).length, total: checks.length }
}

function hasAnyValue(record?: Partial<Record<string, unknown>>): boolean {
  return !!record && Object.keys(record).length > 0
}

/** 充実度レベルを判定する。閾値は引数で上書き可能（テスト容易性）。 */
export function completenessLevel(
  store: Store,
  richThreshold: number = RICH_THRESHOLD,
  poorThreshold: number = POOR_THRESHOLD,
): 'rich' | 'poor' | 'mid' {
  const { filled } = computeCompleteness(store)
  if (filled >= richThreshold) return 'rich'
  if (filled <= poorThreshold) return 'poor'
  return 'mid'
}

/** 充実度フィルタを適用する。'all' は素通し。 */
export function filterStoresByCompleteness(stores: Store[], level: CompletenessLevel): Store[] {
  if (level === 'all') return stores
  return stores.filter((store) => completenessLevel(store) === level)
}
