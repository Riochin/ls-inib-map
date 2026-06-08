import { describe, it, expect } from 'vitest'
import { computeMarkerDiff } from '@/hooks/use-store-clusterer'

describe('computeMarkerDiff', () => {
  it('同一集合では追加も削除も発生しない（再生成抑止・Req1.7）', () => {
    const diff = computeMarkerDiff(['a', 'b', 'c'], ['a', 'b', 'c'])
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
  })

  it('順序が異なっても同一集合なら差分なし', () => {
    const diff = computeMarkerDiff(['a', 'b', 'c'], ['c', 'a', 'b'])
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
  })

  it('新規IDのみ added に含まれる', () => {
    const diff = computeMarkerDiff(['a', 'b'], ['a', 'b', 'c', 'd'])
    expect(diff.added.sort()).toEqual(['c', 'd'])
    expect(diff.removed).toEqual([])
  })

  it('消失IDのみ removed に含まれる', () => {
    const diff = computeMarkerDiff(['a', 'b', 'c'], ['a'])
    expect(diff.added).toEqual([])
    expect(diff.removed.sort()).toEqual(['b', 'c'])
  })

  it('追加と削除が同時に発生するケース', () => {
    const diff = computeMarkerDiff(['a', 'b', 'c'], ['b', 'c', 'd', 'e'])
    expect(diff.added.sort()).toEqual(['d', 'e'])
    expect(diff.removed.sort()).toEqual(['a'])
  })

  it('空の現在集合からの初期追加', () => {
    const diff = computeMarkerDiff([], ['a', 'b'])
    expect(diff.added.sort()).toEqual(['a', 'b'])
    expect(diff.removed).toEqual([])
  })

  it('空の次集合への全削除', () => {
    const diff = computeMarkerDiff(['a', 'b'], [])
    expect(diff.added).toEqual([])
    expect(diff.removed.sort()).toEqual(['a', 'b'])
  })

  it('Set など任意の Iterable を受け付ける', () => {
    const diff = computeMarkerDiff(new Set(['a', 'b']), new Set(['b', 'c']))
    expect(diff.added).toEqual(['c'])
    expect(diff.removed).toEqual(['a'])
  })
})
