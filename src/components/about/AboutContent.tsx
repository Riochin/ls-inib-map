import type { GameTitle } from '@/types/store'
import type { AreaSummary } from '@/lib/area'
import { formatLastUpdated } from '@/lib/info-display'
import { CATCH_FONT_STYLE, HEADING_FONT_STYLE } from '@/lib/heading-font'
import {
  AUTHOR_NAME,
  X_HANDLE,
  X_URL,
  TWEET_HASHTAG,
  HASHTAG_URL,
  DATA_BASIC,
  PRIVACY_NOTE,
  DISCLAIMER,
  GAME_NAMES,
  gameFullWithShort,
} from '@/lib/site-config'
import {
  aboutTitle,
  ABOUT_FAQ,
  buildAboutBreadcrumbJsonLd,
  buildAboutPageJsonLd,
  buildFaqPageJsonLd,
} from '@/lib/about-seo'
import { AboutFeedbackButton } from '@/components/about/AboutFeedbackButton'
import { SiteFooter } from '@/components/SiteFooter'

/**
 * `/about`（このアプリについて）の本文（同期・presentational）。
 *
 * データ取得は親（`page.tsx`）が担い、本コンポーネントは描画のみ（SSR レンダリングで
 * 単体テスト可能にするため非同期処理を持たない）。オンボーディングモーダルと同じ事実
 * （免責・データ方針・開発者情報）を {@link ../../lib/site-config} から共有しつつ、検索向けに
 * 正式名称・対応タイトル・できること・FAQ・エリア導線を厚く出力する。
 */

const BRAND_PURPLE = '#7B2FBE'
/** タイトル別の出力順（area と共通）。 */
const GAME_TITLES: readonly GameTitle[] = ['gundam-exvs', 'jojo-ls']

/** このアプリでできること（オンボーディングの操作案内・凡例に対応）。 */
const FEATURES: string[] = [
  '全国のゲームセンターの設置店舗を地図でまとめて確認できます。',
  'タイトル（ラスサバ／イニブ）で表示を切り替えられます。',
  '都道府県・市区町村のエリアで絞り込めます。',
  '現在地から近い設置店舗を探せます。',
  '設置台数の確からしさ（公式の公表値／利用者報告／確認済み）を色で見分けられます。',
]

interface AboutContentProps {
  /** データ最終更新日時（ISO 8601・任意）。欠落時は更新日表示を省略する。 */
  lastUpdated?: string | null
  /** 掲載中の営業店舗の総数（カバレッジ表示用）。 */
  totalStores: number
  /** 店舗が存在する都道府県の数（カバレッジ表示用）。 */
  prefectureCount: number
  /** 店舗数の多い人気エリア（内部リンク用・上位数件）。 */
  popularAreas: AreaSummary[]
}

export function AboutContent({ lastUpdated, totalStores, prefectureCount, popularAreas }: AboutContentProps) {
  const formatted = lastUpdated ? formatLastUpdated(lastUpdated) : null
  const breadcrumbLd = buildAboutBreadcrumbJsonLd()
  const aboutLd = buildAboutPageJsonLd()
  const faqLd = buildFaqPageJsonLd()

  return (
    <article className="flex flex-col gap-6">
      <nav aria-label="パンくず" className="text-xs text-gray-500">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 静的SEOページのため素の<a>を使う */}
        <a href="/" className="hover:underline" style={{ color: BRAND_PURPLE }}>
          ホーム
        </a>
        <span className="mx-1">›</span>
        <span>このアプリについて</span>
      </nav>

      <header>
        <h1 className="text-2xl leading-snug" style={{ ...CATCH_FONT_STYLE, color: BRAND_PURPLE }}>
          {aboutTitle()}
        </h1>
        <p className="mt-2 text-gray-700 leading-relaxed">
          {gameFullWithShort('jojo-ls')}と{gameFullWithShort('gundam-exvs')}
          の設置されたゲームセンターを、地図でまとめて確認できる非公式の個人開発アプリです。
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          対応タイトル
        </h2>
        <dl className="flex flex-col gap-3">
          {GAME_TITLES.map((game) => {
            const n = GAME_NAMES[game]
            return (
              <div key={game}>
                <dt className="text-sm font-semibold text-gray-800">
                  {n.full}（{n.short}）
                </dt>
                <dd className="text-xs text-gray-500 mt-0.5">別名・表記：{n.aliases.join('・')}</dd>
              </div>
            )
          })}
        </dl>
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          このアプリでできること
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm text-gray-700 leading-relaxed list-disc pl-5">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          データについて
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          全国<strong>{prefectureCount}都道府県</strong>・計<strong>{totalStores}店</strong>
          の営業中店舗を掲載しています。
        </p>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-gray-700 leading-relaxed list-disc pl-5">
          <li>ラスサバ・イニブ各タイトルの公式設置店舗一覧から、店舗情報を自動で収集しています。</li>
          <li>定期的に自動更新し、公式一覧の変更（新規・閉店・移設など）を反映しています。</li>
          <li>住所をもとに地図上へ配置しています。住所の精度が低い店舗は「おおよその位置」として表示します。</li>
          <li>設置台数は出どころ（公式の公表値／利用者からの報告／管理者が確認済み）を区別して表示しています。</li>
          <li>利用者からの修正報告・要望を受け付け、運営が内容を確認のうえ反映しています。</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">{DATA_BASIC}</p>
        {formatted && <p className="mt-1 text-xs text-gray-500">データ最終更新：{formatted}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          よくある質問
        </h2>
        <dl className="flex flex-col gap-4">
          {ABOUT_FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-semibold text-gray-800">Q. {f.q}</dt>
              <dd className="mt-1 text-sm text-gray-700 leading-relaxed">A. {f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          エリアから探す
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          都道府県別の設置店舗一覧から、お住まいの地域のゲームセンターを探せます。
        </p>
        {popularAreas.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {popularAreas.map((a) => (
              <li key={a.slug}>
                <a href={`/area/${a.slug}`} className="hover:underline" style={{ color: BRAND_PURPLE }}>
                  {a.prefecture}（{a.total}店）
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 静的SEOページのため素の<a>を使う */}
          <a href="/area" className="font-semibold hover:underline" style={{ color: BRAND_PURPLE }}>
            すべての都道府県を見る →
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          プライバシー
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">{PRIVACY_NOTE}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          免責
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">{DISCLAIMER}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
          開発者・お問い合わせ
        </h2>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-xs font-semibold text-gray-500 mb-1">開発者</dt>
            <dd>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-gray-800 hover:text-purple-700"
              >
                {AUTHOR_NAME}（@{X_HANDLE}）
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 mb-1">ハッシュタグ</dt>
            <dd>
              <a
                href={HASHTAG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-purple-700 hover:underline"
              >
                #{TWEET_HASHTAG}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-500 mb-1">ご要望・不具合の報告</dt>
            <dd>
              <AboutFeedbackButton />
            </dd>
          </div>
        </dl>
      </section>

      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </article>
  )
}
