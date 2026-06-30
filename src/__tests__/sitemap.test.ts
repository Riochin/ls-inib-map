import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { getAreaPrefectures } from '@/lib/area'
import { storesMeta } from '@/data/stores'

const SITE_URL = 'https://lsib.world'

describe('sitemap', () => {
  it('トップ（/）の URL を含む', () => {
    const entries = sitemap()
    expect(entries.some((e) => e.url === SITE_URL)).toBe(true)
  })

  it('エリアハブ /area の URL を含む', () => {
    const entries = sitemap()
    expect(entries.some((e) => e.url === `${SITE_URL}/area`)).toBe(true)
  })

  it('店舗のある全都道府県の /area/<slug> URL を含む', () => {
    const entries = sitemap()
    const urls = new Set(entries.map((e) => e.url))
    for (const area of getAreaPrefectures()) {
      expect(urls.has(`${SITE_URL}/area/${area.slug}`)).toBe(true)
    }
  })

  it('県ページ URL の件数がエリア集計の都道府県数と一致する', () => {
    const entries = sitemap()
    const prefUrls = entries.filter((e) => /\/area\/[^/]+$/.test(e.url))
    expect(prefUrls.length).toBe(getAreaPrefectures().length)
  })

  it('各 URL に最終更新日（storesMeta.lastUpdated 由来）を付与する', () => {
    const entries = sitemap()
    const expected = storesMeta?.lastUpdated
      ? new Date(storesMeta.lastUpdated).getTime()
      : null
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date)
      if (expected !== null) {
        expect((entry.lastModified as Date).getTime()).toBe(expected)
      }
    }
  })
})

describe('robots', () => {
  it('新設の /area 配下を含む全パスのクロールを許可する（既存方針を維持）', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const allowsArea = rules.some((rule) => {
      const allow = rule?.allow
      const allowList = Array.isArray(allow) ? allow : allow ? [allow] : []
      return allowList.includes('/')
    })
    expect(allowsArea).toBe(true)
  })

  it('サイトマップの場所を指す', () => {
    const result = robots()
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
})
