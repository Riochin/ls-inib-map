import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAreaForPrefecture, getAreaPrefectures } from '@/lib/area'
import { storesMeta } from '@/data/stores'
import { areaTitle, areaDescription, areaCanonicalPath } from '@/lib/area-seo'
import { AreaPageContent } from '@/components/area/AreaPageContent'

/**
 * 県エリアページ `/area/[pref]`（Server Component・SSG）。
 *
 * データ取得・存在判定・メタデータのみを担い、本文描画は同期コンポーネント
 * {@link AreaPageContent} に委譲する（renderToStaticMarkup で本文を単体テスト可能にするため）。
 * `[pref]` はローマ字スラッグ（例 `/area/tokyo`）。店舗データは既存 `stores` のみを使い、
 * ビルド時に静的生成される（データ更新は次回ビルドで自動反映）。
 */

interface AreaPageParams {
  pref: string
}

/** 店舗が1件以上ある全都道府県のスラッグを静的パラメータとして列挙する。 */
export function generateStaticParams(): AreaPageParams[] {
  return getAreaPrefectures().map((area) => ({ pref: area.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<AreaPageParams>
}): Promise<Metadata> {
  const { pref } = await params
  const detail = getAreaForPrefecture(pref)
  if (!detail) return {}
  return {
    title: areaTitle(detail.prefecture),
    description: areaDescription(detail),
    alternates: { canonical: areaCanonicalPath(detail.slug) },
  }
}

export default async function AreaPrefecturePage({
  params,
}: {
  params: Promise<AreaPageParams>
}) {
  const { pref } = await params
  const detail = getAreaForPrefecture(pref)
  if (!detail) notFound()

  return (
    <AreaPageContent
      detail={detail}
      lastUpdated={storesMeta?.lastUpdated}
      source={storesMeta.source}
      otherAreas={getAreaPrefectures()}
    />
  )
}
