import { describe, it, expect } from 'vitest'
import type { OverrideEntry } from '@/types/overrides'

describe('OverrideEntry型拡張フィールド', () => {
  it('新属性フィールドをすべて含む OverrideEntry を構築できる', () => {
    const entry: OverrideEntry = {
      source: 'admin',
      businessHours: '10:00-23:00',
      floor: '2F',
      smoking: 'no',
      payments: ['Suica', 'PayPay'],
      hasRecording: 'yes',
      hasStreaming: 'unknown',
    }
    expect(entry.businessHours).toBe('10:00-23:00')
    expect(entry.floor).toBe('2F')
    expect(entry.smoking).toBe('no')
    expect(entry.payments).toEqual(['Suica', 'PayPay'])
    expect(entry.hasRecording).toBe('yes')
    expect(entry.hasStreaming).toBe('unknown')
  })

  it('新属性フィールドはすべて任意（既存フィールドのみでも OverrideEntry 型に適合する）', () => {
    const entry: OverrideEntry = {
      source: 'user-report',
      note: 'ユーザー報告',
    }
    expect(entry.businessHours).toBeUndefined()
    expect(entry.floor).toBeUndefined()
    expect(entry.smoking).toBeUndefined()
    expect(entry.payments).toBeUndefined()
    expect(entry.hasRecording).toBeUndefined()
    expect(entry.hasStreaming).toBeUndefined()
  })

  it('既存フィールドとの共存', () => {
    const entry: OverrideEntry = {
      source: 'admin',
      machineCounts: { 'jojo-ls': 3 },
      closed: false,
      updatedAt: '2026-06-18T00:00:00Z',
      businessHours: '11:00-22:00',
      floor: 'B1',
      smoking: 'yes',
    }
    expect(entry.machineCounts?.['jojo-ls']).toBe(3)
    expect(entry.closed).toBe(false)
    expect(entry.updatedAt).toBe('2026-06-18T00:00:00Z')
    expect(entry.businessHours).toBe('11:00-22:00')
    expect(entry.floor).toBe('B1')
    expect(entry.smoking).toBe('yes')
  })
})
