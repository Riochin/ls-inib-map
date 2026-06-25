import type { FilterOption, StoreFilter, AddressFilter, FacilityFilter, CompletenessLevel } from '@/types/store'

/** 前回開いていたフィルタタブを記憶する localStorage キー（`ls-exvs-` 接頭辞で統一）。 */
export const FILTER_STORAGE_KEY = 'ls-exvs-filter'

/** 統合フィルタ（住所＋設備＋充実度）を記憶する localStorage キー。 */
export const STORE_FILTER_STORAGE_KEY = 'ls-exvs-store-filter'

const VALID_FILTERS: readonly FilterOption[] = ['all', 'jojo-ls', 'gundam-exvs']

function isFilterOption(value: string | null): value is FilterOption {
  return value !== null && (VALID_FILTERS as readonly string[]).includes(value)
}

/**
 * 保存済みのフィルタタブを読み出す。
 * 未保存・不正値・localStorage 不可環境（プライベートモード等）では null を返す。
 */
export function loadSavedFilter(): FilterOption | null {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    return isFilterOption(saved) ? saved : null
  } catch {
    return null
  }
}

/**
 * フィルタタブを保存する。
 * localStorage 不可環境では握りつぶす（タブ選択自体は呼び出し側で反映済みのため）。
 */
export function saveFilter(filter: FilterOption): void {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, filter)
  } catch {
    // 永続化できなくても選択自体は反映する
  }
}

const VALID_COMPLETENESS: readonly CompletenessLevel[] = ['all', 'rich', 'poor']

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function sanitizeAddress(raw: unknown): AddressFilter {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    region: strOrNull(o.region),
    prefectures: stringArray(o.prefectures),
    cities: stringArray(o.cities),
    wards: stringArray(o.wards),
  }
}

function sanitizeFacility(raw: unknown): FacilityFilter {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const min = o.minMachines
  return {
    minMachines: typeof min === 'number' && Number.isFinite(min) && min >= 0 ? min : null,
    hasStreaming: o.hasStreaming === true,
    hasRecording: o.hasRecording === true,
    hasSmoking: o.hasSmoking === true,
    openOnly: o.openOnly === true,
  }
}

/**
 * 保存済みの統合フィルタを読み出す。フィールド単位で防御的にサニタイズし、
 * 一部が破損していても残りを活かす。壊れた JSON・非オブジェクト・例外環境では null。
 */
export function loadSavedStoreFilter(): StoreFilter | null {
  try {
    const saved = localStorage.getItem(STORE_FILTER_STORAGE_KEY)
    if (saved === null) return null
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const completeness = VALID_COMPLETENESS.includes(o.completeness as CompletenessLevel)
      ? (o.completeness as CompletenessLevel)
      : 'all'
    return {
      address: sanitizeAddress(o.address),
      facility: sanitizeFacility(o.facility),
      completeness,
    }
  } catch {
    return null
  }
}

/**
 * 統合フィルタを保存する。localStorage 不可環境では握りつぶす。
 */
export function saveStoreFilter(filter: StoreFilter): void {
  try {
    localStorage.setItem(STORE_FILTER_STORAGE_KEY, JSON.stringify(filter))
  } catch {
    // 永続化できなくてもフィルタ自体は呼び出し側で反映済み
  }
}
