import { SITE_URL, GAME_NAMES, TWEET_HASHTAG, gameFullWithShort } from '@/lib/site-config'
import type { GameTitle } from '@/types/store'

/**
 * トップページ（root layout）の SEO 用定数・ヘルパー（純関数）。
 *
 * {@link ./area-seo}・{@link ./about-seo} のミラー。サイト名・description・keywords・構造化データを
 * ここで組み立て、`layout.tsx` から読む。タイトル名は {@link GAME_NAMES} から作り、直書きしない。
 */

/** サイト名（OGP の siteName・JSON-LD の name と共通）。 */
export const SITE_NAME = 'ラスサバ・イニブ 設置店舗マップ'

/**
 * トップページのメタ description（OGP・Twitter・JSON-LD と共通）。
 * イニブは検索の多い別名（インフィニットブースト）を1つ添え、「設置・稼働店舗」で
 * 「設置店舗」「稼働店舗」の両方の言い方を含める。
 */
export const SITE_DESCRIPTION =
  `${gameFullWithShort('jojo-ls')}と${gameFullWithShort('gundam-exvs', 1)}の設置・稼働店舗を、` +
  '全国47都道府県・約760店舗から地図で検索。公式サイトから自動更新しています。'

const GAME_ORDER: readonly GameTitle[] = ['jojo-ls', 'gundam-exvs']

/** 汎用の検索語（タイトル名以外）。 */
const GENERIC_KEYWORDS = ['設置店舗', '稼働店舗', '設置店', '筐体', 'ゲームセンター', 'マップ', '地図検索']

/**
 * keywords メタ。Google は順位付けに使わないが、名称の一貫性のため {@link GAME_NAMES} から作る。
 * 前作（`predecessor`）は含めない。
 */
export const SITE_KEYWORDS: string[] = [
  ...new Set([
    ...GAME_ORDER.flatMap((g) => [GAME_NAMES[g].short, GAME_NAMES[g].full, ...GAME_NAMES[g].aliases]),
    ...GENERIC_KEYWORDS,
    TWEET_HASHTAG,
  ]),
]

/**
 * 構造化データ（JSON-LD）。サイト自体を表す WebApplication として宣言し、
 * リッチリザルト/サイトリンク等の対象になりやすくする。店舗（第三者施設・個別ページ無し）の
 * LocalBusiness 化はガイドライン上のリスクがあるため意図的に含めない。
 * トップの画面には別名が出ていないため、`alternateName` は付けない（`/about` 側に付ける）。
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
