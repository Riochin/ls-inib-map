import { describe, it, expect } from 'vitest'
import {
  activeFilterChips,
  removeFilterChip,
  describeAddress,
  describeFacility,
  describeCompleteness,
} from '@/lib/filter-summary'
import { EMPTY_STORE_FILTER } from '@/types/store'
import type { StoreFilter } from '@/types/store'

function filter(partial: Partial<StoreFilter>): StoreFilter {
  return { ...EMPTY_STORE_FILTER, ...partial }
}

describe('activeFilterChips', () => {
  it('空フィルターはチップなし', () => {
    expect(activeFilterChips(EMPTY_STORE_FILTER)).toEqual([])
  })

  it('地方・都県・市区・設備・充実度をチップ化する（順序付き）', () => {
    const f = filter({
      address: { region: '関東', prefectures: ['東京都', '神奈川県'], cities: ['新宿区'], wards: [] },
      facility: { minMachines: 3, hasStreaming: true, hasRecording: false, hasSmoking: false, openOnly: true },
      completeness: 'poor',
    })
    const labels = activeFilterChips(f).map((c) => c.label)
    expect(labels).toEqual([
      '関東',
      '東京都',
      '神奈川県',
      '新宿区',
      '3台以上',
      '配信台あり',
      '営業中',
      '情報が不足',
    ])
  })

  it('completeness が all のときは充実度チップを出さない', () => {
    expect(activeFilterChips(filter({ completeness: 'all' }))).toEqual([])
  })
})

describe('removeFilterChip', () => {
  const base = filter({
    address: { region: '関東', prefectures: ['東京都', '神奈川県'], cities: ['新宿区'], wards: ['西区'] },
    facility: { minMachines: 3, hasStreaming: true, hasRecording: false, hasSmoking: false, openOnly: true },
    completeness: 'poor',
  })

  it('地方チップを外すと region が null', () => {
    expect(removeFilterChip(base, 'region').address.region).toBeNull()
  })

  it('都県チップを外すと当該県が消え、市区/区はリセット', () => {
    const next = removeFilterChip(base, 'pref:東京都')
    expect(next.address.prefectures).toEqual(['神奈川県'])
    expect(next.address.cities).toEqual([])
    expect(next.address.wards).toEqual([])
  })

  it('市区チップを外すと当該市区が消え、区はリセット', () => {
    const next = removeFilterChip(base, 'city:新宿区')
    expect(next.address.cities).toEqual([])
    expect(next.address.wards).toEqual([])
  })

  it('設備チップを外すと該当フラグが false', () => {
    expect(removeFilterChip(base, 'facility:hasStreaming').facility.hasStreaming).toBe(false)
    expect(removeFilterChip(base, 'facility:openOnly').facility.openOnly).toBe(false)
  })

  it('最低台数チップを外すと null', () => {
    expect(removeFilterChip(base, 'minMachines').facility.minMachines).toBeNull()
  })

  it('充実度チップを外すと all', () => {
    expect(removeFilterChip(base, 'completeness').completeness).toBe('all')
  })

  it('チップの key で実際に削除できる（往復）', () => {
    let f = base
    for (const chip of activeFilterChips(base)) {
      f = removeFilterChip(f, chip.key)
    }
    expect(activeFilterChips(f)).toEqual([])
  })
})

describe('セクションサマリー', () => {
  it('describeAddress', () => {
    expect(describeAddress(EMPTY_STORE_FILTER.address)).toBe('指定なし')
    expect(describeAddress({ region: '関東', prefectures: [], cities: [], wards: [] })).toBe('関東')
    expect(
      describeAddress({ region: null, prefectures: ['東京都', '神奈川県'], cities: [], wards: [] }),
    ).toBe('東京都 ほか1')
    expect(
      describeAddress({ region: null, prefectures: ['東京都'], cities: ['新宿区'], wards: [] }),
    ).toBe('東京都・新宿区')
  })

  it('describeFacility', () => {
    expect(describeFacility(EMPTY_STORE_FILTER.facility)).toBe('指定なし')
    expect(
      describeFacility({ minMachines: 3, hasStreaming: true, hasRecording: false, hasSmoking: false, openOnly: true }),
    ).toBe('3台以上・配信台あり・営業中')
  })

  it('describeCompleteness', () => {
    expect(describeCompleteness('all')).toBe('指定なし')
    expect(describeCompleteness('rich')).toBe('情報が充実した店')
    expect(describeCompleteness('poor')).toBe('情報が不足した店')
  })
})
