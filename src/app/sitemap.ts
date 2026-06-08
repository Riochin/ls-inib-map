import type { MetadataRoute } from 'next'
import { storesMeta } from '@/data/stores'

const SITE_URL = 'https://ls-inib-map.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = storesMeta?.lastUpdated
    ? new Date(storesMeta.lastUpdated)
    : new Date()

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
