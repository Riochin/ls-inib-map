import type { AreaSummary } from '@/lib/area'
import { areaHubTitle } from '@/lib/area-seo'
import { CATCH_FONT_STYLE, HEADING_FONT_STYLE } from '@/lib/heading-font'
import { SiteFooter } from '@/components/SiteFooter'

/**
 * エリア一覧ハブ `/area` の本文（同期・presentational）。
 *
 * データ取得は親（`page.tsx`）が担い、本コンポーネントは AreaSummary[] を受け取って
 * 描画のみ行う（SSR レンダリングで単体テスト可能にするため非同期処理を持たない）。
 * 店舗が1件以上ある都道府県への可視リンク集（設置店舗数を併記）と、サイト全体の概況を
 * 単一 `<h1>` で示す。見出しは見出しフォント・ブランド紫で design language を踏襲する。
 */

const BRAND_PURPLE = '#7B2FBE'

export function AreaHubContent({ areas }: { areas: AreaSummary[] }) {
  const totalStores = areas.reduce((sum, a) => sum + a.total, 0)
  const prefectureCount = areas.length

  return (
    <article className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl leading-snug" style={{ ...CATCH_FONT_STYLE, color: BRAND_PURPLE }}>
          {areaHubTitle()}
        </h1>
        <p className="mt-2 text-gray-700">
          全国<strong>{prefectureCount}都道府県</strong>・計<strong>{totalStores}店</strong>{' '}
          の営業中店舗を都道府県別に掲載しています。気になる地域を選ぶと、タイトル別（イニブ／ラスサバ）の設置店舗一覧を確認できます。
        </p>
      </header>

      <nav aria-label="都道府県一覧">
        <h2 className="mb-3 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          都道府県から探す
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {areas.map((a) => (
            <li key={a.slug}>
              <a href={`/area/${a.slug}`} className="hover:underline" style={{ color: BRAND_PURPLE }}>
                {a.prefecture}（{a.total}店）
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <SiteFooter />
    </article>
  )
}
