import { describe, it, expect } from 'vitest'
import {
  toJstYmd,
  isoWeekday,
  isWeekend,
  daysInMonth,
  dayMode,
  buildPairScheduleView,
} from '@/lib/pair-schedule'
import type { PairScheduleFile, PairScheduleMonth } from '@/types/pair-schedule'

// 2026年6月: 1日=月, 2日=火, 6日=土, 7日=日, 9日=火
const JUNE: PairScheduleMonth = {
  year: 2026,
  month: 6,
  // 平日(火)・土・月 をペア戦に設定（土日は記載有無に関わらず both になる検証用に6日も含める）
  pairDates: ['2026-06-02', '2026-06-06', '2026-06-08'],
  sourceUrl: 'https://jojols-w.bn-am.net/web/info/detail/JUNE',
  postedAt: '2026-05-13',
  fetchedAt: '2026-06-01T00:00:00Z',
}
const FILE: PairScheduleFile = { updatedAt: '2026-06-01T00:00:00Z', months: [JUNE] }

describe('toJstYmd', () => {
  it('UTC正午は同日のJST', () => {
    expect(toJstYmd(new Date('2026-06-09T03:00:00Z'))).toMatchObject({ year: 2026, month: 6, day: 9 })
  })

  it('UTC深夜跨ぎはJSTで翌日になる', () => {
    // 2026-06-08T15:30Z = 2026-06-09 00:30 JST
    expect(toJstYmd(new Date('2026-06-08T15:30:00Z'))).toMatchObject({ year: 2026, month: 6, day: 9, iso: '2026-06-09' })
  })

  it('年末跨ぎ', () => {
    // 2026-12-31T15:30Z = 2027-01-01 00:30 JST
    expect(toJstYmd(new Date('2026-12-31T15:30:00Z'))).toMatchObject({ year: 2027, month: 1, day: 1 })
  })
})

describe('isoWeekday / isWeekend', () => {
  it('曜日を正しく返す（2026-06-06 は土）', () => {
    expect(isoWeekday('2026-06-06')).toBe(6)
    expect(isoWeekday('2026-06-07')).toBe(0)
    expect(isoWeekday('2026-06-09')).toBe(2)
  })
  it('土日判定', () => {
    expect(isWeekend('2026-06-06')).toBe(true)
    expect(isWeekend('2026-06-07')).toBe(true)
    expect(isWeekend('2026-06-09')).toBe(false)
  })
})

describe('daysInMonth', () => {
  it('うるう年の2月は29日', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
  })
  it('平年の2月は28日', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
  })
  it('6月は30日', () => {
    expect(daysInMonth(2026, 6)).toBe(30)
  })
})

describe('dayMode', () => {
  const pairSet = new Set(JUNE.pairDates)
  it('平日で記載あり → pair', () => {
    expect(dayMode('2026-06-02', pairSet)).toBe('pair') // 火・記載
    expect(dayMode('2026-06-08', pairSet)).toBe('pair') // 月・記載
  })
  it('平日で記載なし → solo', () => {
    expect(dayMode('2026-06-03', pairSet)).toBe('solo') // 水・未記載
    expect(dayMode('2026-06-09', pairSet)).toBe('solo') // 火・未記載
  })
  it('土日 → both（記載有無に関わらず）', () => {
    expect(dayMode('2026-06-06', pairSet)).toBe('both') // 土・記載あり でも both
    expect(dayMode('2026-06-07', pairSet)).toBe('both') // 日・未記載 でも both
  })
})

describe('buildPairScheduleView', () => {
  it('当月データありで今日のモードと日別一覧を導出する', () => {
    const view = buildPairScheduleView(FILE, new Date('2026-06-09T03:00:00Z'))
    expect(view.hasCurrentMonth).toBe(true)
    expect(view.todayMode).toBe('solo') // 6/9 火・未記載
    expect(view.todayMonth).toBe(6)
    expect(view.todayDay).toBe(9)
    expect(view.days).toHaveLength(30)
    const today = view.days.find((d) => d.isToday)
    expect(today?.iso).toBe('2026-06-09')
    // 各モードの検証
    expect(view.days.find((d) => d.day === 2)?.mode).toBe('pair')
    expect(view.days.find((d) => d.day === 6)?.mode).toBe('both')
    expect(view.days.find((d) => d.day === 3)?.mode).toBe('solo')
  })

  it('当月データが無ければ todayMode=null / hasCurrentMonth=false', () => {
    // 7月時点では当月(7月)データが無い
    const view = buildPairScheduleView(FILE, new Date('2026-07-15T03:00:00Z'))
    expect(view.hasCurrentMonth).toBe(false)
    expect(view.todayMode).toBeNull()
    expect(view.month).toBeNull()
    expect(view.days).toEqual([])
    expect(view.todayMonth).toBe(7)
  })

  it('複数月が存在しても今日の月を選ぶ', () => {
    const may: PairScheduleMonth = { ...JUNE, month: 5, pairDates: ['2026-05-01'] }
    const multi: PairScheduleFile = { updatedAt: 'x', months: [may, JUNE] }
    const view = buildPairScheduleView(multi, new Date('2026-06-09T03:00:00Z'))
    expect(view.month?.month).toBe(6)
  })
})
