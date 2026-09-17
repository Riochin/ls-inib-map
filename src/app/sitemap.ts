import type { MetadataRoute } from 'next'
import { storesMeta } from '@/data/stores'
import { getAreaPrefectures, getAreaLastModified } from '@/lib/area'
import { SITE_URL } from '@/lib/site-config'

/**
 * サイトマップ。
 *
 * `lastmod` は「そのページの内容が実際に変わった日時」だけを出す:
 * - トップ・エリア一覧・about: 店舗データ全体の生成日時（`storesMeta.lastUpdated`。生成器の
 *   差分ゲートにより、店舗に実体差分があった回にしか進まない）。件数・更新日を表示するため連動する。
 * - 県ページ: その県の店舗集合が変わった日時か、その県の店舗情報の運営更新日の新しい方
 *   （{@link getAreaLastModified}）。どちらも無い県は `lastmod` を省略する
 *   （根拠のない日付を出すより省略が検索エンジンの推奨）。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = storesMeta?.lastUpdated
    ? new Date(storesMeta.lastUpdated)
    : new Date()

  const areas = getAreaPrefectures()

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/area`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...areas.map((area) => {
      const areaLastModified = getAreaLastModified(area.slug)
      return {
        url: `${SITE_URL}/area/${area.slug}`,
        ...(areaLastModified ? { lastModified: areaLastModified } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }
    }),
  ]
}
