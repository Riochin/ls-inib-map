import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { getAreaPrefectures, getAreaLastModified } from '@/lib/area'
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

  it('トップ・/area・/about の最終更新日はデータ全体の生成日時（storesMeta.lastUpdated）', () => {
    const entries = sitemap()
    const expected = new Date(storesMeta.lastUpdated).getTime()
    for (const url of [SITE_URL, `${SITE_URL}/area`, `${SITE_URL}/about`]) {
      const entry = entries.find((e) => e.url === url)
      expect(entry?.lastModified).toBeInstanceOf(Date)
      expect((entry!.lastModified as Date).getTime()).toBe(expected)
    }
  })

  it('県ページの最終更新日はその県固有の更新日時（getAreaLastModified）を使う', () => {
    const entries = sitemap()
    for (const area of getAreaPrefectures()) {
      const entry = entries.find((e) => e.url === `${SITE_URL}/area/${area.slug}`)
      const expected = getAreaLastModified(area.slug)
      if (expected === null) {
        expect(entry?.lastModified).toBeUndefined()
      } else {
        expect((entry!.lastModified as Date).getTime()).toBe(expected.getTime())
      }
    }
  })

  it('県ページの最終更新日が全県一律（storesMeta.lastUpdated のコピー）になっていない', () => {
    // 実データでは県ごとに更新時期が異なるはず。全県が同じ日時なら lastmod が根拠を失っている。
    const entries = sitemap()
    const times = new Set(
      entries
        .filter((e) => /\/area\/[^/]+$/.test(e.url))
        .map((e) => (e.lastModified as Date | undefined)?.getTime()),
    )
    expect(times.size).toBeGreaterThan(1)
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
