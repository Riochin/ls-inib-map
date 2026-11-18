import { describe, it, expect } from 'vitest'
import {
  isCountOverrideStale,
  listMissingCountBaselines,
  listStaleCountOverrides,
  officialCount,
  syncCountBaselines,
} from '@/lib/count-baseline'
import type { OverridesFile } from '@/types/overrides'

const stores = [
  { id: 'a', name: '店A', machineCounts: { 'jojo-ls': 5, 'gundam-exvs': 2 } },
  { id: 'b', name: '店B', machineCounts: { 'gundam-exvs': 3 } },
  { id: 'c', name: '店C' },
]

const file = (overrides: OverridesFile['overrides']): OverridesFile => ({ overrides })

describe('officialCount / isCountOverrideStale', () => {
  it('台数が無いゲームは 0', () => {
    expect(officialCount(stores[0], 'jojo-ls')).toBe(5)
    expect(officialCount(stores[1], 'jojo-ls')).toBe(0)
    expect(officialCount(undefined, 'jojo-ls')).toBe(0)
  })

  it('基準値と違えば古い。基準値が無ければ古くない', () => {
    expect(isCountOverrideStale(2, 5)).toBe(true)
    expect(isCountOverrideStale(0, 5)).toBe(true)
    expect(isCountOverrideStale(5, 5)).toBe(false)
    expect(isCountOverrideStale(2, undefined)).toBe(false)
  })
})

describe('syncCountBaselines', () => {
  it('基準値が無ければ今の公式値を入れ、machineCounts の直後に置く。updatedAt は変えない', () => {
    const input = file({
      a: { source: 'admin', note: 'x', machineCounts: { 'jojo-ls': 4 }, updatedAt: '2026-01-01' },
    })
    const { file: out, changedIds } = syncCountBaselines(input, stores)
    expect(changedIds).toEqual(['a'])
    expect(out.overrides.a).toEqual({
      source: 'admin',
      note: 'x',
      machineCounts: { 'jojo-ls': 4 },
      countBaselines: { 'jojo-ls': 5 },
      updatedAt: '2026-01-01',
    })
    expect(Object.keys(out.overrides.a)).toEqual(['source', 'note', 'machineCounts', 'countBaselines', 'updatedAt'])
  })

  it('公式に台数が無いゲームの基準値は 0', () => {
    const { file: out } = syncCountBaselines(file({ c: { source: 'admin', machineCounts: { 'jojo-ls': 2 } } }), stores)
    expect(out.overrides.c.countBaselines).toEqual({ 'jojo-ls': 0 })
  })

  it('台数を変えていなければ、公式が変わっても基準値は動かない', () => {
    const entry = { source: 'admin' as const, machineCounts: { 'jojo-ls': 4 }, countBaselines: { 'jojo-ls': 9 } }
    const { file: out, changedIds } = syncCountBaselines(file({ a: entry }), stores, { base: file({ a: entry }) })
    expect(changedIds).toEqual([])
    expect(out.overrides.a).toBe(entry)
  })

  it('base から台数を変えた・足したゲームは、今の公式値にし直す', () => {
    const base = file({ a: { source: 'admin', machineCounts: { 'jojo-ls': 4 }, countBaselines: { 'jojo-ls': 9 } } })
    const next = file({
      a: {
        source: 'admin',
        machineCounts: { 'jojo-ls': 3, 'gundam-exvs': 1 },
        countBaselines: { 'jojo-ls': 9 },
      },
      b: { source: 'user-report', machineCounts: { 'gundam-exvs': 2 } },
    })
    const { file: out, changedIds } = syncCountBaselines(next, stores, { base })
    expect(changedIds).toEqual(['a', 'b'])
    expect(out.overrides.a.countBaselines).toEqual({ 'jojo-ls': 5, 'gundam-exvs': 2 })
    expect(out.overrides.b.countBaselines).toEqual({ 'gundam-exvs': 3 })
  })

  it('confirmIds の店は、台数はそのままで今の公式値を基準にする', () => {
    const entry = { source: 'admin' as const, machineCounts: { 'jojo-ls': 4 }, countBaselines: { 'jojo-ls': 9 } }
    const { file: out } = syncCountBaselines(file({ a: entry }), stores, { base: file({ a: entry }), confirmIds: ['a'] })
    expect(out.overrides.a.countBaselines).toEqual({ 'jojo-ls': 5 })
    expect(out.overrides.a.machineCounts).toEqual({ 'jojo-ls': 4 })
  })

  it('台数を消したゲームの基準値は消す。台数が全部無くなれば countBaselines ごと消す', () => {
    const { file: out } = syncCountBaselines(
      file({
        a: { source: 'admin', machineCounts: { 'jojo-ls': 4 }, countBaselines: { 'jojo-ls': 5, 'gundam-exvs': 2 } },
        b: { source: 'admin', closed: true, countBaselines: { 'gundam-exvs': 3 } },
      }),
      stores,
    )
    expect(out.overrides.a.countBaselines).toEqual({ 'jojo-ls': 5 })
    expect(out.overrides.b).toEqual({ source: 'admin', closed: true })
  })

  it('店舗が見つからない ID は触らない', () => {
    const entry = { source: 'admin' as const, machineCounts: { 'jojo-ls': 4 } }
    const { file: out, changedIds } = syncCountBaselines(file({ zzz: entry }), stores)
    expect(changedIds).toEqual([])
    expect(out.overrides.zzz).toBe(entry)
  })
})

describe('listMissingCountBaselines', () => {
  it('台数があるのに基準値が無いゲームを挙げる', () => {
    expect(
      listMissingCountBaselines(
        file({
          a: { source: 'admin', machineCounts: { 'jojo-ls': 4, 'gundam-exvs': 1 }, countBaselines: { 'jojo-ls': 5 } },
          b: { source: 'admin', closed: true },
        }),
      ),
    ).toEqual([{ id: 'a', game: 'gundam-exvs' }])
  })
})

describe('listStaleCountOverrides', () => {
  it('公式の台数が基準値から変わった上書きだけを挙げる', () => {
    const overrides = file({
      a: { source: 'admin', machineCounts: { 'jojo-ls': 4, 'gundam-exvs': 2 }, countBaselines: { 'jojo-ls': 6, 'gundam-exvs': 2 } },
      b: { source: 'admin', name: '店B（新）', machineCounts: { 'gundam-exvs': 1 }, countBaselines: { 'gundam-exvs': 3 } },
      c: { source: 'admin', machineCounts: { 'jojo-ls': 2 }, countBaselines: { 'jojo-ls': 4 } },
    })
    expect(listStaleCountOverrides(stores, overrides)).toEqual([
      { id: 'a', name: '店A', game: 'jojo-ls', baseline: 6, official: 5, override: 4 },
      { id: 'c', name: '店C', game: 'jojo-ls', baseline: 4, official: 0, override: 2 },
    ])
  })
})
