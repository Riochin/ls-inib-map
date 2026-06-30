import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  FILTER_STORAGE_KEY,
  STORE_FILTER_STORAGE_KEY,
  loadSavedFilter,
  saveFilter,
  loadSavedStoreFilter,
  saveStoreFilter,
  parseFilterFromSearch,
  buildFilterQueryUrl,
} from '@/lib/filter-storage'
import { EMPTY_STORE_FILTER } from '@/types/store'
import type { StoreFilter } from '@/types/store'

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

const SAMPLE_FILTER: StoreFilter = {
  address: { region: '関東', prefectures: ['東京都'], cities: ['新宿区'], wards: [] },
  facility: { minMachines: 3, hasStreaming: true, hasRecording: false, hasSmoking: true, openOnly: true },
  completeness: 'poor',
}

describe('loadSavedStoreFilter', () => {
  it('未保存のときは null を返す', () => {
    vi.stubGlobal('localStorage', createStorageMock())
    expect(loadSavedStoreFilter()).toBeNull()
  })

  it('保存した統合フィルターを往復で復元する', () => {
    const mock = createStorageMock()
    vi.stubGlobal('localStorage', mock)
    saveStoreFilter(SAMPLE_FILTER)
    expect(loadSavedStoreFilter()).toEqual(SAMPLE_FILTER)
  })

  it('壊れた JSON は null を返す', () => {
    vi.stubGlobal('localStorage', createStorageMock({ [STORE_FILTER_STORAGE_KEY]: '{bogus' }))
    expect(loadSavedStoreFilter()).toBeNull()
  })

  it('オブジェクトでない JSON は null を返す', () => {
    vi.stubGlobal('localStorage', createStorageMock({ [STORE_FILTER_STORAGE_KEY]: '"x"' }))
    expect(loadSavedStoreFilter()).toBeNull()
  })

  it('部分破損（minMachines が文字列）は当該のみ既定へ正規化し他は生存', () => {
    const broken = JSON.stringify({
      address: { region: '関東', prefectures: [], cities: [], wards: [] },
      facility: { ...EMPTY_STORE_FILTER.facility, minMachines: 'abc', hasStreaming: true },
      completeness: 'rich',
    })
    vi.stubGlobal('localStorage', createStorageMock({ [STORE_FILTER_STORAGE_KEY]: broken }))
    const result = loadSavedStoreFilter()
    expect(result?.facility.minMachines).toBeNull()
    expect(result?.facility.hasStreaming).toBe(true)
    expect(result?.address.region).toBe('関東')
    expect(result?.completeness).toBe('rich')
  })

  it('不正な completeness は all に矯正する', () => {
    const broken = JSON.stringify({ ...EMPTY_STORE_FILTER, completeness: 'xxx' })
    vi.stubGlobal('localStorage', createStorageMock({ [STORE_FILTER_STORAGE_KEY]: broken }))
    expect(loadSavedStoreFilter()?.completeness).toBe('all')
  })

  it('cities に非文字列が混ざると文字列のみ残す', () => {
    const broken = JSON.stringify({
      address: { region: null, prefectures: ['東京都'], cities: [1, '新宿区', null], wards: [] },
      facility: EMPTY_STORE_FILTER.facility,
      completeness: 'all',
    })
    vi.stubGlobal('localStorage', createStorageMock({ [STORE_FILTER_STORAGE_KEY]: broken }))
    expect(loadSavedStoreFilter()?.address.cities).toEqual(['新宿区'])
  })

  it('localStorage が例外を投げる環境では null を返す', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('SecurityError')
      }),
    })
    expect(loadSavedStoreFilter()).toBeNull()
  })

  it('旧スキーマ（単一 prefecture 文字列・prefectures なし）でもクラッシュせず安全に取り込む', () => {
    // 複数選択化より前のバージョンが書いた可能性のあるデータ形
    const legacy = JSON.stringify({
      address: { region: '関東', prefecture: '東京都', cities: ['新宿区'] },
      facility: { hasStreaming: true },
      completeness: 'rich',
    })
    vi.stubGlobal('localStorage', createStorageMock({ [STORE_FILTER_STORAGE_KEY]: legacy }))
    const result = loadSavedStoreFilter()
    // 未知の prefecture キーは黙って捨て（prefectures は空）、有効な値は活かす
    expect(result?.address.prefectures).toEqual([])
    expect(result?.address.region).toBe('関東')
    expect(result?.address.cities).toEqual(['新宿区'])
    expect(result?.facility.hasStreaming).toBe(true)
    expect(result?.completeness).toBe('rich')
  })
})

describe('saveStoreFilter', () => {
  it('専用キーで JSON 保存する', () => {
    const mock = createStorageMock()
    vi.stubGlobal('localStorage', mock)
    saveStoreFilter(EMPTY_STORE_FILTER)
    expect(mock.setItem).toHaveBeenCalledWith(STORE_FILTER_STORAGE_KEY, JSON.stringify(EMPTY_STORE_FILTER))
  })

  it('既存のタブ用キーとは別キーで保存する（衝突しない）', () => {
    const mock = createStorageMock({ [FILTER_STORAGE_KEY]: 'jojo-ls' })
    vi.stubGlobal('localStorage', mock)
    saveStoreFilter(SAMPLE_FILTER)
    // タブ用キーは loadSavedFilter で従来通り読める
    expect(loadSavedFilter()).toBe('jojo-ls')
  })

  it('localStorage が例外を投げても throw しない', () => {
    vi.stubGlobal('localStorage', {
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError')
      }),
    })
    expect(() => saveStoreFilter(EMPTY_STORE_FILTER)).not.toThrow()
  })
})

describe('parseFilterFromSearch', () => {
  it('?game= が無ければ null', () => {
    expect(parseFilterFromSearch('')).toBeNull()
  })

  it('?game= が不正値なら null', () => {
    expect(parseFilterFromSearch('?game=foo')).toBeNull()
  })

  it('?game=jojo-ls を返す', () => {
    expect(parseFilterFromSearch('?game=jojo-ls')).toBe('jojo-ls')
  })

  it('他のパラメータと併存していても読める', () => {
    expect(parseFilterFromSearch('?store=abc&game=gundam-exvs')).toBe('gundam-exvs')
  })
})

describe('buildFilterQueryUrl', () => {
  it('all では ?game= を付けない（既定値は URL に載せない）', () => {
    expect(buildFilterQueryUrl('https://example.com/', 'all')).toBe('/')
  })

  it('jojo-ls では ?game=jojo-ls を付ける', () => {
    expect(buildFilterQueryUrl('https://example.com/', 'jojo-ls')).toBe('/?game=jojo-ls')
  })

  it('既存の ?game= を新しい値で上書きする', () => {
    expect(buildFilterQueryUrl('https://example.com/?game=jojo-ls', 'gundam-exvs')).toBe(
      '/?game=gundam-exvs'
    )
  })

  it('他のクエリパラメータ（?store= 等）は維持する', () => {
    expect(buildFilterQueryUrl('https://example.com/?store=abc', 'jojo-ls')).toBe(
      '/?store=abc&game=jojo-ls'
    )
  })

  it('all に戻すとき、他のクエリパラメータは維持しつつ ?game= だけ外す', () => {
    expect(buildFilterQueryUrl('https://example.com/?store=abc&game=jojo-ls', 'all')).toBe(
      '/?store=abc'
    )
  })
})
