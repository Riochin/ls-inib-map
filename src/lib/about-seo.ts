import { AUTHOR_NAME, X_URL, GAME_NAMES, gameFullWithShort } from '@/lib/site-config'

/**
 * `/about`（このアプリについて）ページの SEO 用ヘルパー（純関数）。
 *
 * {@link ./area-seo} のミラー。タイトル／ディスクリプション／canonical と、構造化データ
 * （BreadcrumbList・AboutPage＋著者 Person・FAQPage）の生成を担う。`page.tsx` から
 * 呼び出され、ビルド時に評価される。個別店舗の LocalBusiness 化は行わない（area と同方針）。
 */

/** 本番サイトの絶対 URL（layout/sitemap/area-seo と同値）。 */
export const ABOUT_SITE_URL = 'https://ls-inib-map.vercel.app'

/** ページ／メタの見出し（layout の title テンプレートで「｜サイト名」が付く）。 */
export function aboutTitle(): string {
  return 'このサイトについて'
}

/** メタ description（正式名称を含め指名検索の被リンク面を広げる）。 */
export function aboutDescription(): string {
  return (
    `${gameFullWithShort('jojo-ls')}と${gameFullWithShort('gundam-exvs')}の設置店舗を地図で探せる非公式サイト。` +
    '運営者・データの作り方・プライバシー・免責、よくある質問を掲載しています。'
  )
}

/** 自ページの canonical パス。 */
export const ABOUT_CANONICAL = '/about'

/**
 * よくある質問（可視 FAQ と FAQPage 構造化データの単一ソース）。
 * 事実ベースで、ユーザー／検索者が実際に抱く疑問に答える内容に限定する。
 */
export const ABOUT_FAQ: { q: string; a: string }[] = [
  {
    q: `${GAME_NAMES['jojo-ls'].short}・${GAME_NAMES['gundam-exvs'].short}はどこで遊べますか？`,
    a:
      `${GAME_NAMES['jojo-ls'].full}（${GAME_NAMES['jojo-ls'].short}）と` +
      `${GAME_NAMES['gundam-exvs'].full}（${GAME_NAMES['gundam-exvs'].short}）の設置店舗は、` +
      '当サイトの地図、または「設置店舗一覧」から都道府県別に検索できます。',
  },
  {
    q: '設置台数の情報は正確ですか？',
    a:
      '台数は出どころ（公式の公表値／利用者からの報告／管理者が確認済み）を区別して表示しています。' +
      'イニブの公式サイトは「ライブモニター」を含めて台数を表示するため、実際の設置台数より多い場合があります。',
  },
  {
    q: '情報が古い・間違っている場合はどうすればいいですか？',
    a: 'ページ内の要望フォームから報告できます。いただいた内容は運営が確認のうえ反映します（即時反映ではありません）。',
  },
  {
    q: 'これは公式サイトですか？',
    a: 'いいえ。ファン制作の非公式サービスであり、権利者とは一切関係ありません。',
  },
  {
    q: '利用は無料ですか？',
    a: '無料でご利用いただけます。会員登録も不要です。',
  },
]

/** パンくず（ホーム → このサイトについて）の BreadcrumbList 構造化データ。 */
export function buildAboutBreadcrumbJsonLd(siteUrl: string = ABOUT_SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'このサイトについて', item: `${siteUrl}/about` },
    ],
  }
}

/** ページ自体を表す AboutPage 構造化データ（著者 Person を sameAs=X で紐づけ・E-E-A-T）。 */
export function buildAboutPageJsonLd(siteUrl: string = ABOUT_SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: aboutTitle(),
    url: `${siteUrl}/about`,
    description: aboutDescription(),
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      sameAs: [X_URL],
    },
  }
}

/** FAQPage 構造化データ（リッチリザルト対象。可視 FAQ と同一ソース {@link ABOUT_FAQ}）。 */
export function buildFaqPageJsonLd(faq: { q: string; a: string }[] = ABOUT_FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}
