import { describe, it, expect } from 'vitest'
import { generateStaticParams, generateMetadata } from '@/app/area/[pref]/page'
import { getAreaPrefectures } from '@/lib/area'
import { slugToPrefecture } from '@/lib/prefecture-slug'

/**
 * 県ページ `/area/[pref]` の静的生成パラメータとメタデータを検証する。
 * 実データ（stores）を入力に、エリア集計と静的パラメータの整合を担保する。
 */

describe('generateStaticParams', () => {
  it('店舗が1件以上ある全都道府県のスラッグを列挙する', () => {
    const params = generateStaticParams()
    const expected = getAreaPrefectures().map((a) => a.slug)
    expect(params.map((p) => p.pref).sort()).toEqual([...expected].sort())
  })

  it('列挙した各スラッグは実在の都道府県に解決できる', () => {
    for (const { pref } of generateStaticParams()) {
      expect(slugToPrefecture(pref)).not.toBeNull()
    }
  })
})

describe('generateMetadata', () => {
  it('県名と件数を含む title・canonical を設定する', async () => {
    const slug = getAreaPrefectures()[0].slug
    const prefecture = slugToPrefecture(slug)!
    const meta = await generateMetadata({ params: Promise.resolve({ pref: slug }) })
    expect(String(meta.title)).toContain(prefecture)
    expect(meta.alternates?.canonical).toBe(`/area/${slug}`)
  })
})
