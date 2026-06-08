import { describe, it, expect } from 'vitest'
import { buildCountLabel, formatLastUpdated, DEFAULT_DATA_SOURCE } from '@/lib/info-display'

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

describe('formatLastUpdated', () => {
  it('有効なISO日時を日本向けの文字列に整形する（Req5.3）', () => {
    const out = formatLastUpdated('2026-06-08T05:45:00Z')
    expect(out).not.toBeNull()
    expect(out).toContain('2026')
  })

  it('タイムゾーンを JST 固定で整形する（SSR/クライアントのハイドレーション不一致防止）', () => {
    // 2026-06-07T20:00:00Z は JST では 2026-06-08 05:00。実行環境のTZに依らず JST で日付が繰り上がる。
    const out = formatLastUpdated('2026-06-07T20:00:00Z')
    expect(out).toContain('2026/06/08')
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
