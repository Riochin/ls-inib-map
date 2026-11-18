import { describe, it, expect } from 'vitest'
import overridesFile from '@/data/overrides.json'
import { hasOverrideContent, mergeFormEntry, sanitizeOverrideEntry } from '@/lib/override-entry'
import type { OverrideEntry } from '@/types/overrides'

const full: OverrideEntry = {
  source: 'user-report',
  note: 'テスト店 Issue #1',
  remarks: '2Fに移動',
  updatedAt: '2026-11-01T00:00:00.000Z',
  machineCounts: { 'jojo-ls': 4 },
  businessHours: '10:00-23:00',
  floor: '2F',
  floorByGame: { 'gundam-exvs': '3F' },
  smoking: 'no',
  payments: ['PayPay'],
  hasRecordingByGame: { 'jojo-ls': 'yes' },
  hasStreamingByGame: { 'gundam-exvs': 'unknown' },
  officialUrl: 'https://example.com',
  attributeSources: { floor: 'admin' },
}

describe('sanitizeOverrideEntry', () => {
  it('営業時間・録画台・補足・基準値などを落とさない', () => {
    expect(sanitizeOverrideEntry(full)).toEqual(full)
  })

  it('source が無い・不正なら null', () => {
    expect(sanitizeOverrideEntry({ note: 'x' })).toBeNull()
    expect(sanitizeOverrideEntry({ source: 'someone' })).toBeNull()
    expect(sanitizeOverrideEntry(null)).toBeNull()
  })

  it('型の合わない値は項目ごと落とす', () => {
    const out = sanitizeOverrideEntry({
      source: 'admin',
      machineCounts: { 'jojo-ls': 'たくさん', 'gundam-exvs': 3 },
      smoking: 'maybe',
      payments: ['PayPay', 1],
      lat: 'x',
      closed: 'yes',
      hasRecordingByGame: { 'jojo-ls': 'yes', 'gundam-exvs': 'あり' },
    })
    expect(out).toEqual({
      source: 'admin',
      machineCounts: { 'gundam-exvs': 3 },
      hasRecordingByGame: { 'jojo-ls': 'yes' },
    })
  })

  it('知らない項目はそのまま残す', () => {
    expect(sanitizeOverrideEntry({ source: 'admin', futureField: { a: 1 } })).toEqual({
      source: 'admin',
      futureField: { a: 1 },
    })
  })

  it('実データの overrides.json は読み書きしても変わらない', () => {
    const overrides = (overridesFile as { overrides: Record<string, unknown> }).overrides
    for (const [id, entry] of Object.entries(overrides)) {
      expect(sanitizeOverrideEntry(entry), id).toEqual(entry)
    }
  })
})

describe('mergeFormEntry', () => {
  it('フォームに無い項目は既存のまま残し、フォームの項目は置き換える', () => {
    const out = mergeFormEntry(full, { source: 'user-report', machineCounts: { 'jojo-ls': 3 } }, '店名')
    expect(out.machineCounts).toEqual({ 'jojo-ls': 3 })
    expect(out.businessHours).toBe('10:00-23:00')
    expect(out.hasRecordingByGame).toEqual({ 'jojo-ls': 'yes' })
    expect(out.updatedAt).toBe(full.updatedAt)
  })

  it('フォームで空にした補足・台数は消える。メモが空なら店名を入れる', () => {
    const out = mergeFormEntry(full, { source: 'user-report' }, '店名')
    expect(out.remarks).toBeUndefined()
    expect(out.machineCounts).toBeUndefined()
    expect(out.note).toBe('店名')
  })

  it('台数の個別の出どころはフォームの出どころに合わせて外す', () => {
    const existing: OverrideEntry = { ...full, countSources: { 'jojo-ls': 'admin' } }
    const out = mergeFormEntry(existing, { source: 'user-report', machineCounts: { 'jojo-ls': 4 } }, '店名')
    expect(out.countSources).toBeUndefined()
  })

  it('出どころを変えても、フォームに無い属性の出どころは元のまま残す', () => {
    const out = mergeFormEntry(full, { source: 'admin', machineCounts: { 'jojo-ls': 4 } }, '店名')
    expect(out.source).toBe('admin')
    expect(out.attributeSources).toEqual({
      floor: 'admin',
      businessHours: 'user-report',
      smoking: 'user-report',
      payments: 'user-report',
      hasRecordingByGame: 'user-report',
      hasStreamingByGame: 'user-report',
      officialUrl: 'user-report',
    })
  })

  it('新規の店は、フォームの項目だけで作る', () => {
    expect(mergeFormEntry(undefined, { source: 'admin', closed: true }, '店名')).toEqual({
      source: 'admin',
      closed: true,
      note: '店名',
    })
  })
})

describe('hasOverrideContent', () => {
  it('出どころ・メモだけなら false、営業時間などがあれば true', () => {
    expect(hasOverrideContent({ source: 'admin', note: 'x', attributeSources: { floor: 'admin' } })).toBe(false)
    expect(hasOverrideContent({ source: 'admin', businessHours: '10:00-' })).toBe(true)
  })
})
