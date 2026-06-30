import type { MetadataRoute } from 'next'
import { storesMeta } from '@/data/stores'
import { getAreaPrefectures } from '@/lib/area'

const SITE_URL = 'https://lsib.world'

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
    ...areas.map((area) => ({
      url: `${SITE_URL}/area/${area.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
