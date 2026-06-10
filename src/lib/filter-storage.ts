import type { FilterOption } from '@/types/store'

/** 前回開いていたフィルタタブを記憶する localStorage キー（`ls-exvs-` 接頭辞で統一）。 */
export const FILTER_STORAGE_KEY = 'ls-exvs-filter'

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
