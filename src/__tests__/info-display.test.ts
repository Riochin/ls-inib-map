import { describe, it, expect } from 'vitest'
import { buildCountLabel, formatCoverageRate, formatLastUpdated, DEFAULT_DATA_SOURCE } from '@/lib/info-display'

describe('buildCountLabel', () => {
  it('非フィルタ時は総数のみを表示する（Req4.1）', () => {
    expect(buildCountLabel(239, 239, false)).toBe('全 239 件')
  })

  it('フィルタ時は「絞り込み / 総数」を表示する（Req4.2）', () => {
    expect(buildCountLabel(239, 12, true)).toBe('12 / 239 件')
  })

  it('総数0でも破綻しない', () => {
    expect(buildCountLabel(0, 0, false)).toBe('全 0 件')
  })
})

describe('formatCoverageRate', () => {
  it('掲載数と公式総数から網羅率（%）を四捨五入で返す（Req4.3）', () => {
    expect(formatCoverageRate(80, 100)).toBe(80)
    expect(formatCoverageRate(1, 3)).toBe(33)
    expect(formatCoverageRate(2, 3)).toBe(67)
  })

  it('公式総数が0以下なら null を返す（算出不能）', () => {
    expect(formatCoverageRate(10, 0)).toBeNull()
    expect(formatCoverageRate(10, -1)).toBeNull()
  })
})

describe('formatLastUpdated', () => {
  it('有効なISO日時を日本向けの文字列に整形する（Req5.3）', () => {
    const out = formatLastUpdated('2026-06-08T05:45:00Z')
    expect(out).not.toBeNull()
    expect(out).toContain('2026')
  })

  it('不正な日時文字列は null を返す（グレースフルデグラデーション）', () => {
    expect(formatLastUpdated('not-a-date')).toBeNull()
    expect(formatLastUpdated('')).toBeNull()
  })
})

describe('DEFAULT_DATA_SOURCE', () => {
  it('公式2サイトのURLを既定値として保持する（Req6.4）', () => {
    expect(DEFAULT_DATA_SOURCE.jojols).toContain('bandainamco-am.co.jp')
    expect(DEFAULT_DATA_SOURCE.gundam).toContain('gundam-vs.jp')
  })
})
