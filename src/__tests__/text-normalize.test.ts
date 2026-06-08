import { describe, it, expect } from 'vitest'
import { normalizeTextBasics } from '@/lib/text-normalize'

describe('normalizeTextBasics', () => {
  it('全角英数字を半角へ変換する', () => {
    expect(normalizeTextBasics('ＡＢＣ１２３')).toBe('ABC123')
  })

  it('全角空白を半角空白へ変換する', () => {
    expect(normalizeTextBasics('東京都　新宿区')).toBe('東京都 新宿区')
  })

  it('前後の空白を除去する', () => {
    expect(normalizeTextBasics('  東京都新宿区  ')).toBe('東京都新宿区')
  })

  it('連続する空白を1つへまとめる', () => {
    expect(normalizeTextBasics('東京都   新宿区')).toBe('東京都 新宿区')
  })

  it('全角・半角・連続空白が混在しても一貫して正規化する', () => {
    expect(normalizeTextBasics('　東京都　 新宿区３丁目  ')).toBe('東京都 新宿区3丁目')
  })

  it('日本語（漢字・かな）は変換しない', () => {
    expect(normalizeTextBasics('新宿スポーツランド')).toBe('新宿スポーツランド')
  })

  it('既に正規化済みの文字列はそのまま返す（冪等）', () => {
    const s = '東京都新宿区新宿3-22-12'
    expect(normalizeTextBasics(s)).toBe(s)
    expect(normalizeTextBasics(normalizeTextBasics(s))).toBe(s)
  })

  it('空文字列を安全に扱う', () => {
    expect(normalizeTextBasics('')).toBe('')
    expect(normalizeTextBasics('   ')).toBe('')
  })
})
