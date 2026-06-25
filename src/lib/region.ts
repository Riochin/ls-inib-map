import { PREFECTURES } from '@/lib/address-parser'

/** 標準8地方区分 */
export const REGIONS = [
  '北海道',
  '東北',
  '関東',
  '中部',
  '近畿',
  '中国',
  '四国',
  '九州沖縄',
] as const

export type Region = (typeof REGIONS)[number]

/**
 * 地方 → 所属都道府県（正式名）のマッピング。
 * 三重県は8地方区分の慣例に従い近畿に含める。
 */
const REGION_PREFECTURES: Record<Region, readonly string[]> = {
  北海道: ['北海道'],
  東北: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  関東: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  中部: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  近畿: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  中国: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  四国: ['徳島県', '香川県', '愛媛県', '高知県'],
  九州沖縄: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
}

/** 都道府県(正式名) → 地方の逆引きマップ */
const PREFECTURE_TO_REGION = new Map<string, Region>(
  (Object.entries(REGION_PREFECTURES) as [Region, readonly string[]][]).flatMap(
    ([region, prefs]) => prefs.map((p) => [p, region] as [string, Region]),
  ),
)

/** 都道府県(正式名)が属する地方を返す。未知なら null。 */
export function regionOfPrefecture(prefecture: string): Region | null {
  return PREFECTURE_TO_REGION.get(prefecture) ?? null
}

/**
 * 地方に属する都道府県(正式名)の配列を返す。
 * 並び順は {@link PREFECTURES}（全国の標準順）に揃える。未知の地方は空配列。
 */
export function prefecturesOfRegion(region: string): string[] {
  if (!(region in REGION_PREFECTURES)) return []
  const set = new Set(REGION_PREFECTURES[region as Region])
  return PREFECTURES.filter((p) => set.has(p))
}
