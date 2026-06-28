import type { Metadata } from 'next'
import { storesMeta } from '@/data/stores'
import { getAreaPrefectures } from '@/lib/area'
import { aboutTitle, aboutDescription, ABOUT_CANONICAL } from '@/lib/about-seo'
import { AboutContent } from '@/components/about/AboutContent'

/**
 * `/about`（このアプリについて）ページ（Server Component・SSG）。
 *
 * 運営者・データの作り方・プライバシー・免責を示す見える信頼性ページ（E-E-A-T）。
 * オンボーディングモーダル内にしか無かった内容を、固有 URL・h1・構造化データを持つ
 * 実在ページへ昇格させる。データ取得・メタデータのみを担い、本文描画は同期コンポーネント
 * {@link AboutContent} に委譲する（renderToStaticMarkup で単体テスト可能にするため）。
 */

const areas = getAreaPrefectures()
const totalStores = areas.reduce((sum, a) => sum + a.total, 0)
/** 店舗数の多い順の上位（人気エリアの内部リンク用）。 */
const popularAreas = [...areas].sort((a, b) => b.total - a.total).slice(0, 8)

export const metadata: Metadata = {
  title: aboutTitle(),
  description: aboutDescription(),
  alternates: { canonical: ABOUT_CANONICAL },
}

export default function AboutPage() {
  return (
    <AboutContent
      lastUpdated={storesMeta?.lastUpdated}
      totalStores={totalStores}
      prefectureCount={areas.length}
      popularAreas={popularAreas}
    />
  )
}
