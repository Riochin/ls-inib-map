import { SITE_URL, gameFullWithShort } from '@/lib/site-config'

/**
 * トップページ（root layout）の SEO 用定数・ヘルパー（純関数）。
 *
 * {@link ./area-seo}・{@link ./about-seo} のミラー。サイト名・description・構造化データを
 * ここで組み立て、`layout.tsx` から読む。タイトル名は {@link GAME_NAMES} から作り、直書きしない。
 */

/** サイト名（OGP の siteName・JSON-LD の name と共通）。 */
export const SITE_NAME = 'ラスサバ・イニブ 設置店舗マップ'

/** トップページのメタ description（OGP・Twitter・JSON-LD と共通）。 */
export const SITE_DESCRIPTION =
  `${gameFullWithShort('jojo-ls')}と${gameFullWithShort('gundam-exvs')}の設置店舗を、` +
  '全国47都道府県・約760店舗から地図で検索。公式サイトから自動更新しています。'

/**
 * 構造化データ（JSON-LD）。サイト自体を表す WebApplication として宣言し、
 * リッチリザルト/サイトリンク等の対象になりやすくする。店舗（第三者施設・個別ページ無し）の
 * LocalBusiness 化はガイドライン上のリスクがあるため意図的に含めない。
 */
export function buildSiteJsonLd(siteUrl: string = SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    applicationCategory: 'ReferenceApplication',
    operatingSystem: 'Web',
    inLanguage: 'ja',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
  }
}
