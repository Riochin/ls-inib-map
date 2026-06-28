import type { AreaDetail, AreaSummary } from '@/lib/area'
import type { GameTitle } from '@/types/store'
import type { StoresMeta } from '@/types/stores-file'
import { getGameLabel } from '@/lib/marker-color'
import { formatLastUpdated } from '@/lib/info-display'
import { areaTitle, buildBreadcrumbJsonLd, buildItemListJsonLd } from '@/lib/area-seo'
import { CATCH_FONT_STYLE, HEADING_FONT_STYLE } from '@/lib/heading-font'
import { AreaBreadcrumb } from '@/components/area/AreaBreadcrumb'
import { AreaStoreList } from '@/components/area/AreaStoreList'

/**
 * 県ページ `/area/[pref]` の本文（同期・presentational）。
 *
 * データ取得・`notFound()` は親（`page.tsx`）が担い、本コンポーネントは
 * AreaDetail を受け取って描画のみ行う（SSR レンダリングで単体テスト可能にするため
 * 非同期処理を持たない）。見出しは見出しフォント（全文字版・`/area` レイアウトで読込）と
 * ブランド紫を用いる。動的な店名・住所はシステムフォント（AreaStoreList 側）。
 */

const BRAND_PURPLE = '#7B2FBE'
/** タイトル別セクションの出力順 */
const GAME_TITLES: readonly GameTitle[] = ['gundam-exvs', 'jojo-ls']

interface AreaPageContentProps {
  detail: AreaDetail
  /** データ最終更新日時（ISO 8601・任意）。欠落時は更新日表示を省略する。 */
  lastUpdated?: string | null
  /** データ出典 URL（ラスサバ／イニブ公式）。 */
  source: StoresMeta['source']
  /** ページ間回遊用の全エリアサマリ（自県は描画時に除外）。 */
  otherAreas: AreaSummary[]
}

export function AreaPageContent({ detail, lastUpdated, source, otherAreas }: AreaPageContentProps) {
  const formatted = lastUpdated ? formatLastUpdated(lastUpdated) : null
  const breadcrumbLd = buildBreadcrumbJsonLd(detail)
  const itemListLd = buildItemListJsonLd(detail)
  const links = otherAreas.filter((a) => a.slug !== detail.slug)

  return (
    <article className="flex flex-col gap-6">
      <AreaBreadcrumb prefecture={detail.prefecture} />

      <header>
        <h1 className="text-2xl leading-snug" style={{ ...CATCH_FONT_STYLE, color: BRAND_PURPLE }}>
          {areaTitle(detail.prefecture)}
        </h1>
        <p className="mt-2 text-gray-700">
          {detail.prefecture}内の営業中店舗 <strong>{detail.total}店</strong>{' '}
          を、タイトル別（イニブ／ラスサバ）に掲載しています。各店をタップすると地図アプリで開けます。
        </p>
        <p className="mt-1 text-xs text-gray-500">
          データ出典：
          <a href={source.jojols} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            ラスサバ公式
          </a>
          {' / '}
          <a href={source.gundam} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            イニブ公式
          </a>
          {formatted && <> ・ 更新: {formatted}</>}
        </p>
      </header>

      {GAME_TITLES.map((game) => {
        const list = detail.storesByGame[game]
        if (list.length === 0) return null
        return (
          <section key={game}>
            <h2 className="mb-3 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
              {detail.prefecture}の{getGameLabel(game)}設置店（{list.length}店）
            </h2>
            <AreaStoreList game={game} stores={list} />
          </section>
        )
      })}

      <section>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 静的SEOページのためクライアントJS非依存の素の<a>を使う（Req 7.1） */}
        <a
          href="/"
          className="inline-block rounded-full px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: BRAND_PURPLE }}
        >
          地図アプリで{detail.prefecture}を見る
        </a>
      </section>

      {links.length > 0 && (
        <nav aria-label="他の都道府県" className="border-t border-purple-100 pt-4">
          <h2 className="mb-2 text-base" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
            他の都道府県を見る
          </h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {links.map((a) => (
              <li key={a.slug}>
                <a href={`/area/${a.slug}`} className="hover:underline" style={{ color: BRAND_PURPLE }}>
                  {a.prefecture}（{a.total}店）
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
    </article>
  )
}
