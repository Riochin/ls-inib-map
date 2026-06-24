import { describe, it, expect } from 'vitest'
import {
  buildCountLabel,
  formatLastUpdated,
  formatByGameTernary,
  formatFloorByGame,
  DEFAULT_DATA_SOURCE,
} from '@/lib/info-display'
import type { GameTitle } from '@/types/store'

const BOTH: GameTitle[] = ['jojo-ls', 'gundam-exvs']

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

describe('formatByGameTernary', () => {
  it('複数タイトル店はタイトル別に併記する', () => {
    const out = formatByGameTernary(BOTH, { 'jojo-ls': 'unknown', 'gundam-exvs': 'yes' }, false)
    expect(out).toBe('ラスサバ 不明 ／ イニブ あり')
  })

  it('単一タイトル店はタイトル名を省略して値のみ表示する', () => {
    expect(formatByGameTernary(['gundam-exvs'], { 'gundam-exvs': 'yes' }, false)).toBe('あり')
  })

  it('値が未設定（undefined）なら undefined を返す（呼び出し側で「未登録」表示）', () => {
    expect(formatByGameTernary(BOTH, undefined, false)).toBeUndefined()
  })

  it('どのタイトルにも値が無ければ undefined を返す', () => {
    expect(formatByGameTernary(BOTH, {}, false)).toBeUndefined()
  })

  it('未確認（admin以外）のとき yes/no には（未確認）を付ける', () => {
    const out = formatByGameTernary(BOTH, { 'jojo-ls': 'no', 'gundam-exvs': 'yes' }, true)
    expect(out).toBe('ラスサバ なし（未確認） ／ イニブ あり（未確認）')
  })

  it('未確認でも unknown には（未確認）を付けない', () => {
    const out = formatByGameTernary(BOTH, { 'jojo-ls': 'unknown', 'gundam-exvs': 'yes' }, true)
    expect(out).toBe('ラスサバ 不明 ／ イニブ あり（未確認）')
  })

  it('一部タイトルのみ値があるときは設定済みのタイトルだけ表示する', () => {
    const out = formatByGameTernary(BOTH, { 'gundam-exvs': 'yes' }, false)
    expect(out).toBe('イニブ あり')
  })
})

describe('formatFloorByGame', () => {
  it('複数タイトル店でゲーム別フロアをタイトル別に併記する', () => {
    const out = formatFloorByGame(BOTH, { 'jojo-ls': '2F', 'gundam-exvs': '3F' }, undefined, false)
    expect(out).toEqual({ value: 'ラスサバ 2F ／ イニブ 3F', soft: false })
  })

  it('複数タイトル店で両ゲーム同じ明示フロアなら確定の共通フロアとして1つに集約する', () => {
    const out = formatFloorByGame(BOTH, { 'jojo-ls': '2F', 'gundam-exvs': '2F' }, undefined, false)
    expect(out).toEqual({ value: '2F', soft: false })
  })

  it('共通フロアでも未確認（admin以外）なら集約値に（未確認）を付ける', () => {
    const out = formatFloorByGame(BOTH, { 'jojo-ls': '2F', 'gundam-exvs': '2F' }, undefined, true)
    expect(out).toEqual({ value: '2F（未確認）', soft: true })
  })

  it('店舗共通フロアのみ（floorByGame 無し）でも確定なら共通フロアとして集約する', () => {
    const out = formatFloorByGame(BOTH, undefined, '2F', false)
    expect(out).toEqual({ value: '2F', soft: false })
  })

  it('店舗共通フロアのみで未確認なら共通フロアに（未確認）を付ける', () => {
    const out = formatFloorByGame(BOTH, undefined, '2F', true)
    expect(out).toEqual({ value: '2F（未確認）', soft: true })
  })

  it('フロアが分かれるとき、確定なら未確認を付けない', () => {
    const out = formatFloorByGame(BOTH, { 'jojo-ls': '5F' }, '2F', false)
    expect(out).toEqual({ value: 'ラスサバ 5F ／ イニブ 2F', soft: false })
  })

  it('単一タイトル店も出どころで判定する（確定なら値のみ・タイトル名省略）', () => {
    const out = formatFloorByGame(['gundam-exvs'], undefined, '2F', false)
    expect(out).toEqual({ value: '2F', soft: false })
  })

  it('単一タイトル店も未確認なら（未確認）を付ける', () => {
    const out = formatFloorByGame(['gundam-exvs'], { 'gundam-exvs': '2F' }, undefined, true)
    expect(out).toEqual({ value: '2F（未確認）', soft: true })
  })

  it('フロアが分かれるとき、未確認ならタイトル別に（未確認）を付ける', () => {
    const out = formatFloorByGame(BOTH, { 'jojo-ls': '2F', 'gundam-exvs': '3F' }, undefined, true)
    expect(out).toEqual({ value: 'ラスサバ 2F（未確認） ／ イニブ 3F（未確認）', soft: true })
  })

  it('フロア情報が一つも無ければ value は undefined', () => {
    expect(formatFloorByGame(BOTH, undefined, undefined, false)).toEqual({
      value: undefined,
      soft: false,
    })
    expect(formatFloorByGame(BOTH, {}, '', false)).toEqual({ value: undefined, soft: false })
  })
})

describe('DEFAULT_DATA_SOURCE', () => {
  it('公式2サイトのURLを既定値として保持する（Req6.4）', () => {
    expect(DEFAULT_DATA_SOURCE.jojols).toContain('bandainamco-am.co.jp')
    expect(DEFAULT_DATA_SOURCE.gundam).toContain('gundam-vs.jp')
  })
})
