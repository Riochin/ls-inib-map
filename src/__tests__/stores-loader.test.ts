import { describe, it, expect } from 'vitest'
import { stores, storesMeta } from '@/data/stores'
import storesJson from '@/data/stores.json'
import scrapeAttributesJson from '@/data/scrape-attributes.json'
import overridesJson from '@/data/overrides.json'
import { applyOverrides } from '@/lib/apply-overrides'
import type { Store } from '@/types/store'
import type { OverridesFile } from '@/types/overrides'

describe('stores ローダ（生成 JSON 読込）', () => {
  it('店舗配列を生成 JSON から型安全に公開する', () => {
    expect(Array.isArray(stores)).toBe(true)
    expect(stores.length).toBe(storesJson.stores.length)
  })

  it('メタ情報（lastUpdated・source）を JSON から公開する', () => {
    expect(storesMeta.lastUpdated).toBe(storesJson.lastUpdated)
    expect(storesMeta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(storesMeta.source.jojols).toBe(storesJson.source.jojols)
    expect(storesMeta.source.gundam).toBe(storesJson.source.gundam)
    expect(storesMeta.source.jojols).toMatch(/^https:\/\//)
    expect(storesMeta.source.gundam).toMatch(/^https:\/\//)
  })

  it('ローダは生成 JSON に二層オーバーライド（auto-scrape→手動）を適用して再公開する', () => {
    // layer 1: auto-scrape（scrape-attributes.json）→ layer 2: 手動（overrides.json・常に最優先）
    const expected = applyOverrides(
      applyOverrides(storesJson.stores as Store[], scrapeAttributesJson as OverridesFile),
      overridesJson as OverridesFile,
    )
    expect(stores).toEqual(expected)
  })
})
