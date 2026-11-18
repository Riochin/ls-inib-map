import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  STORE_ATTRIBUTES,
  REPORTABLE_ATTRIBUTES,
  COMPLETENESS_GROUPS,
  hasAttributeValue,
  type AttributeDataKey,
  type AttributeDef,
} from '@/lib/store-attributes'
import type { Store, StoreAttributeKey } from '@/types/store'
import type { OverrideEntry } from '@/types/overrides'

describe('属性レジストリ', () => {
  it('キーは Store と OverrideEntry の両方に存在する（型レベル）', () => {
    expectTypeOf<AttributeDataKey>().toExtend<keyof Store>()
    expectTypeOf<AttributeDataKey>().toExtend<keyof OverrideEntry>()
  })

  it('sourceKey は StoreAttributeKey に含まれ、既存の出どころキーを保つ', () => {
    const sourceKeys = new Set<StoreAttributeKey>(STORE_ATTRIBUTES.map((a) => a.sourceKey))
    for (const key of [
      'businessHours',
      'floor',
      'smoking',
      'payments',
      'hasRecordingByGame',
      'hasStreamingByGame',
      'officialUrl',
    ] as const) {
      expect(sourceKeys.has(key)).toBe(true)
    }
  })

  it('キーは重複しない', () => {
    const keys = STORE_ATTRIBUTES.map((a) => a.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('報告できる属性のラベルは重複しない（Issue 本文の行を一意に読めるように）', () => {
    const labels = REPORTABLE_ATTRIBUTES.map((a) => a.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('付随フィールドの parent は存在し、スコープと出どころキーが本体と一致する', () => {
    const byKey = new Map<string, AttributeDef>(STORE_ATTRIBUTES.map((a) => [a.key, a]))
    for (const a of STORE_ATTRIBUTES as readonly AttributeDef[]) {
      if (a.parent === undefined) continue
      const parent = byKey.get(a.parent)
      expect(parent, a.key).toBeDefined()
      expect(parent?.scope).toBe(a.scope)
      expect(parent?.sourceKey).toBe(a.sourceKey)
      expect(parent?.parent).toBeUndefined()
    }
  })

  it('充実度は台数を除いて6グループ（台数と合わせて7項目）', () => {
    expect(COMPLETENESS_GROUPS).toHaveLength(6)
  })

  it('hasAttributeValue は種類ごとに値の有無を判定する', () => {
    const def = (key: string) => STORE_ATTRIBUTES.find((a) => a.key === key) as AttributeDef
    expect(hasAttributeValue(def('businessHours'), '')).toBe(false)
    expect(hasAttributeValue(def('businessHours'), '10:00')).toBe(true)
    expect(hasAttributeValue(def('smoking'), 'unknown')).toBe(true)
    expect(hasAttributeValue(def('payments'), [])).toBe(false)
    expect(hasAttributeValue(def('hasRecordingByGame'), {})).toBe(false)
    expect(hasAttributeValue(def('hasRecordingByGame'), { 'jojo-ls': 'no' })).toBe(true)
  })
})
