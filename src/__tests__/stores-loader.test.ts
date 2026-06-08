import { describe, it, expect } from 'vitest'
import { stores, storesMeta } from '@/data/stores'
import storesJson from '@/data/stores.json'

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

  it('ローダは生成 JSON の stores と同一内容を返す（read-only 再公開）', () => {
    expect(stores).toEqual(storesJson.stores)
  })
})
