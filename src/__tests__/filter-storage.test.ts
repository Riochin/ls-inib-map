import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  FILTER_STORAGE_KEY,
  loadSavedFilter,
  saveFilter,
} from '@/lib/filter-storage'

/** 最小のインメモリ localStorage モック。 */
function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => store.clear()),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadSavedFilter', () => {
  it('未保存のときは null を返す', () => {
    vi.stubGlobal('localStorage', createStorageMock())
    expect(loadSavedFilter()).toBeNull()
  })

  it('保存済みの有効なタブ値を返す', () => {
    vi.stubGlobal('localStorage', createStorageMock({ [FILTER_STORAGE_KEY]: 'jojo-ls' }))
    expect(loadSavedFilter()).toBe('jojo-ls')
  })

  it('不正な値が保存されている場合は null を返す（破損データ防御）', () => {
    vi.stubGlobal('localStorage', createStorageMock({ [FILTER_STORAGE_KEY]: 'bogus' }))
    expect(loadSavedFilter()).toBeNull()
  })

  it('localStorage が例外を投げる環境（プライベートモード等）では null を返す', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('SecurityError')
      }),
    })
    expect(loadSavedFilter()).toBeNull()
  })
})

describe('saveFilter', () => {
  it('指定したタブ値を正しいキーで保存する', () => {
    const mock = createStorageMock()
    vi.stubGlobal('localStorage', mock)
    saveFilter('gundam-exvs')
    expect(mock.setItem).toHaveBeenCalledWith(FILTER_STORAGE_KEY, 'gundam-exvs')
  })

  it('localStorage が例外を投げても throw しない（選択は呼び出し側で反映済み）', () => {
    vi.stubGlobal('localStorage', {
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError')
      }),
    })
    expect(() => saveFilter('all')).not.toThrow()
  })
})
