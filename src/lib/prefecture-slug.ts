/**
 * 都道府県の正式名 ⇔ ローマ字スラッグ（ヘボン式・小文字・ハイフン不使用）の双方向対応。
 *
 * エリアページ URL（`/area/<slug>`）で用いる。日本語スラッグはエンコードで可読性が
 * 落ちるためローマ字を採用する。キー集合は {@link PREFECTURES}（address-parser）と
 * 1対1に対応し、過不足・重複はテスト（`prefecture-slug.test.ts`）で検出する。
 */

/** 正式名 → スラッグ（47件） */
export const PREFECTURE_SLUGS: Record<string, string> = {
  北海道: 'hokkaido',
  青森県: 'aomori',
  岩手県: 'iwate',
  宮城県: 'miyagi',
  秋田県: 'akita',
  山形県: 'yamagata',
  福島県: 'fukushima',
  茨城県: 'ibaraki',
  栃木県: 'tochigi',
  群馬県: 'gunma',
  埼玉県: 'saitama',
  千葉県: 'chiba',
  東京都: 'tokyo',
  神奈川県: 'kanagawa',
  新潟県: 'niigata',
  富山県: 'toyama',
  石川県: 'ishikawa',
  福井県: 'fukui',
  山梨県: 'yamanashi',
  長野県: 'nagano',
  岐阜県: 'gifu',
  静岡県: 'shizuoka',
  愛知県: 'aichi',
  三重県: 'mie',
  滋賀県: 'shiga',
  京都府: 'kyoto',
  大阪府: 'osaka',
  兵庫県: 'hyogo',
  奈良県: 'nara',
  和歌山県: 'wakayama',
  鳥取県: 'tottori',
  島根県: 'shimane',
  岡山県: 'okayama',
  広島県: 'hiroshima',
  山口県: 'yamaguchi',
  徳島県: 'tokushima',
  香川県: 'kagawa',
  愛媛県: 'ehime',
  高知県: 'kochi',
  福岡県: 'fukuoka',
  佐賀県: 'saga',
  長崎県: 'nagasaki',
  熊本県: 'kumamoto',
  大分県: 'oita',
  宮崎県: 'miyazaki',
  鹿児島県: 'kagoshima',
  沖縄県: 'okinawa',
}

/** スラッグ → 正式名 の逆引き表（モジュール読込時に一度だけ構築） */
const SLUG_TO_PREFECTURE: Record<string, string> = Object.fromEntries(
  Object.entries(PREFECTURE_SLUGS).map(([pref, slug]) => [slug, pref]),
)

/** スラッグ → 正式名。未知のスラッグ（空文字含む）は null。 */
export function slugToPrefecture(slug: string): string | null {
  return SLUG_TO_PREFECTURE[slug] ?? null
}

/** 正式名 → スラッグ。未知の都道府県名（空文字含む）は null。 */
export function prefectureToSlug(prefecture: string): string | null {
  return PREFECTURE_SLUGS[prefecture] ?? null
}
