import { describe, it, expect } from 'vitest'
// @ts-expect-error 自己完結 ESM（型定義なし）を実行時 import
import { buildDraft, detectChanges, countLine, deepEqual } from '../override-tweet-draft.mjs'

const stores = {
  stores: [
    { id: 's1', name: 'テスト店1' },
    { id: 's2', name: 'テスト店2' },
    { id: 's3', name: 'テスト店3' },
  ],
}

const base = { today: '2026-06-19', commitShort: 'abc1234', stores }

describe('deepEqual', () => {
  it('undefined と null を同一視する', () => {
    expect(deepEqual(undefined, null)).toBe(true)
  })
  it('オブジェクトはキー順に依存しない', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })
  it('配列は順序に依存する', () => {
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
  })
  it('値が異なれば false', () => {
    expect(deepEqual({ 'jojo-ls': 4 }, { 'jojo-ls': 5 })).toBe(false)
  })
})

describe('detectChanges', () => {
  it('台数・位置・詳細の変化を独立に判定する', () => {
    const before = { s1: { source: 'admin', floor: '1F' } }
    const after = {
      s1: { source: 'admin', floor: '2F' }, // 詳細のみ
      s2: { source: 'admin', machineCounts: { 'jojo-ls': 4 } }, // 台数（新規）
      s3: { source: 'admin', lat: 35.1, lng: 139.1 }, // 位置（新規）
    }
    const c = detectChanges(before, after)
    expect(c.find((x) => x.id === 's1')).toMatchObject({ counts: false, pos: false, details: true })
    expect(c.find((x) => x.id === 's2')).toMatchObject({ counts: true, pos: false, details: false })
    expect(c.find((x) => x.id === 's3')).toMatchObject({ counts: false, pos: true, details: false })
  })

  it('閉店フラグの立ち上がりを台数変化として検知する', () => {
    const c = detectChanges({ s1: { source: 'admin' } }, { s1: { source: 'admin', closed: true } })
    expect(c[0].counts).toBe(true)
  })

  it('machineCounts がキー順違いだけなら変化なし', () => {
    const before = { s1: { machineCounts: { 'jojo-ls': 2, 'gundam-exvs': 3 } } }
    const after = { s1: { machineCounts: { 'gundam-exvs': 3, 'jojo-ls': 2 } } }
    expect(detectChanges(before, after)[0].counts).toBe(false)
  })
})

describe('countLine', () => {
  it('台数をゲーム表記に変換して連結', () => {
    expect(countLine('店', { machineCounts: { 'jojo-ls': 4, 'gundam-exvs': 18 } })).toBe(
      '・店：ラスサバ4台 / イニブ18台',
    )
  })
  it('閉店は専用表記', () => {
    expect(countLine('店', { closed: true, machineCounts: { 'jojo-ls': 4 } })).toBe('・店：閉店')
  })
})

describe('buildDraft', () => {
  it('admin のみ親ポストに載せ、user-report は未確認参考へ回す', () => {
    const after = {
      s1: { source: 'admin', machineCounts: { 'jojo-ls': 4 } },
      s2: { source: 'user-report', machineCounts: { 'gundam-exvs': 9 } },
    }
    const r = buildDraft({ ...base, before: { overrides: {} }, after: { overrides: after } })
    expect(r.hasAnnouncement).toBe(true)
    expect(r.issueDraft).toContain('【台数情報修正】')
    expect(r.issueDraft).toContain('・テスト店1：ラスサバ4台')
    // user-report は親ポストに出ず、未確認参考に出る
    expect(r.issueDraft).toContain('未確認（みんなの報告）')
    expect(r.issueDraft).toContain('・テスト店2：イニブ9台')
    expect(r.issueDraft.split('【台数情報修正】')[1]).not.toContain('テスト店2：イニブ')
  })

  it('店舗詳細の変化は店名だけの【店舗情報更新】になる', () => {
    const r = buildDraft({
      ...base,
      before: { overrides: { s1: { source: 'admin' } } },
      after: { overrides: { s1: { source: 'admin', smoking: 'yes', floor: '2F' } } },
    })
    expect(r.issueDraft).toContain('【店舗情報更新】')
    expect(r.issueDraft).toContain('・テスト店1')
    // 詳細の値（2F/喫煙所）はツイートに出さない
    expect(r.issueDraft).not.toContain('2F')
  })

  it('位置の変化は【位置情報修正】になる', () => {
    const r = buildDraft({
      ...base,
      before: { overrides: { s1: { source: 'admin', lat: 35.0, lng: 139.0 } } },
      after: { overrides: { s1: { source: 'admin', lat: 35.5, lng: 139.5 } } },
    })
    expect(r.issueDraft).toContain('【位置情報修正】')
  })

  it('admin の変化が皆無なら hasAnnouncement=false', () => {
    const r = buildDraft({
      ...base,
      before: { overrides: {} },
      after: { overrides: { s1: { source: 'user-report', machineCounts: { 'jojo-ls': 4 } } } },
    })
    expect(r.hasAnnouncement).toBe(false)
  })

  it('提供メモを重複排除して集約する', () => {
    const r = buildDraft({
      ...base,
      before: { overrides: {} },
      after: {
        overrides: {
          s1: { source: 'admin', note: '@taro', machineCounts: { 'jojo-ls': 4 }, floor: '2F' },
          s2: { source: 'admin', note: '@taro', lat: 35.1, lng: 139.1 },
        },
      },
    })
    expect(r.providers).toBe('@taro')
  })

  it('レポート本文に日付と短縮SHAの見出しが入る', () => {
    const r = buildDraft({
      ...base,
      before: { overrides: {} },
      after: { overrides: { s1: { source: 'admin', machineCounts: { 'jojo-ls': 4 } } } },
    })
    expect(r.reportBody).toContain('## 2026-06-19 追加分（自動記録 / コミット abc1234）')
  })
})
