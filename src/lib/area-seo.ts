import type { AreaDetail } from '@/lib/area'
import type { GameTitle, Store } from '@/types/store'
import { SITE_URL } from '@/lib/site-config'

/**
 * エリア（県）ページの SEO 用ヘルパー（純関数）。
 *
 * タイトル／ディスクリプション／canonical と、構造化データ（BreadcrumbList・ItemList）の
 * 生成を担う。個別店舗の LocalBusiness 化は行わない（第三者施設・個別ページ無しの
 * ガイドラインリスク回避。Req 5.3）。`page.tsx` から呼び出され、ビルド時に評価される。
 */

/** 本番サイトの絶対 URL（{@link SITE_URL} のエイリアス。layout/sitemap と同値）。 */
export const AREA_SITE_URL = SITE_URL

/** タイトル別の出力順（県ページ・サマリと共通） */
const GAME_TITLES: readonly GameTitle[] = ['gundam-exvs', 'jojo-ls']

/** ページ／メタの見出し: 「○○県のラスサバ・イニブ 設置店舗一覧」。 */
export function areaTitle(prefecture: string): string {
  return `${prefecture}のラスサバ・イニブ 設置店舗一覧`
}

/** メタ description: 県名と件数（営業中店舗数・タイトル別）を含む。 */
export function areaDescription(detail: AreaDetail): string {
  const inib = detail.storesByGame['gundam-exvs'].length
  const lasaba = detail.storesByGame['jojo-ls'].length
  return (
    `${detail.prefecture}のラスサバ（ジョジョ ラストサバイバー）・イニブ（ガンダム EXVS2）` +
    `設置店舗一覧。営業中${detail.total}店（イニブ${inib}店・ラスサバ${lasaba}店）の` +
    `店名・住所・台数を掲載。`
  )
}

/** 自ページの canonical パス（`/area/<slug>`）。 */
export function areaCanonicalPath(slug: string): string {
  return `/area/${slug}`
}

/** ハブページ `/area` の canonical パス。 */
export const AREA_HUB_CANONICAL = '/area'

/** ハブページの見出し／メタタイトル。 */
export function areaHubTitle(): string {
  return '全国のラスサバ・イニブ 設置店舗マップ'
}

/** ハブページのメタ description（総店舗数・都道府県数を含む）。 */
export function areaHubDescription(totalStores: number, prefectureCount: number): string {
  return (
    `全国${prefectureCount}都道府県・計${totalStores}店のラスサバ（ジョジョ ラストサバイバー）・` +
    `イニブ（ガンダム EXVS2）営業中店舗を都道府県別に掲載。地名から設置店舗一覧へアクセスできます。`
  )
}

/** 県内の営業中店舗を ID で重複排除した一覧（タイトル出力順・店名昇順を保持）。 */
function uniqueStores(detail: AreaDetail): Store[] {
  const seen = new Map<string, Store>()
  for (const game of GAME_TITLES) {
    for (const store of detail.storesByGame[game]) {
      if (!seen.has(store.id)) seen.set(store.id, store)
    }
  }
  return [...seen.values()]
}

/** パンくず（ホーム → 設置店舗 → ○○県）の BreadcrumbList 構造化データ。 */
export function buildBreadcrumbJsonLd(detail: AreaDetail, siteUrl: string = AREA_SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: '設置店舗', item: `${siteUrl}/area` },
      { '@type': 'ListItem', position: 3, name: detail.prefecture, item: `${siteUrl}/area/${detail.slug}` },
    ],
  }
}

/** 店舗一覧を表す ItemList 構造化データ（個別店舗は LocalBusiness 化しない）。 */
export function buildItemListJsonLd(detail: AreaDetail, siteUrl: string = AREA_SITE_URL) {
  const items = uniqueStores(detail)
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: areaTitle(detail.prefecture),
    numberOfItems: items.length,
    itemListElement: items.map((store, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: store.name,
      url: `${siteUrl}/?store=${store.id}`,
    })),
  }
}
