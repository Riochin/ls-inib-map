import type { Metadata } from 'next'
import { getAreaPrefectures } from '@/lib/area'
import { areaHubTitle, areaHubDescription, AREA_HUB_CANONICAL } from '@/lib/area-seo'
import { AreaHubContent } from '@/components/area/AreaHubContent'

/**
 * エリア一覧ハブページ `/area`（Server Component・SSG）。
 *
 * 店舗が1件以上ある全都道府県エリアページへのリンク集と、サイト全体の概況を出力する
 * クロール入口。データ取得・メタデータのみを担い、本文描画は同期コンポーネント
 * {@link AreaHubContent} に委譲する（renderToStaticMarkup で単体テスト可能にするため）。
 * 店舗データは既存 `stores` のみを使い、ビルド時に静的生成される（データ更新は次回ビルドで自動反映）。
 */

const areas = getAreaPrefectures()
const totalStores = areas.reduce((sum, a) => sum + a.total, 0)

export const metadata: Metadata = {
  title: areaHubTitle(),
  description: areaHubDescription(totalStores, areas.length),
  alternates: { canonical: AREA_HUB_CANONICAL },
}

export default function AreaHubPage() {
  return <AreaHubContent areas={areas} />
}
