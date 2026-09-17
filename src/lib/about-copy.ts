import { GAME_NAMES } from '@/lib/site-config'

/**
 * `/about` LP 部分（ヒーロー・困りごと・嬉しいポイント・まとめ）の文言と画像メタ情報の単一ソース。
 *
 * 2026-07-11 の紹介配信スライドの流れ（課題 → 作った → 嬉しいポイント3つ → まとめ）を踏襲する。
 * 文言を直すときはここだけを触ればよい（FAQ を `about-seo.ts` に置いているのと同じ方針）。
 *
 * - 店舗数はデータ由来の引数で受け取る。スクショ内の固定数字（768件）を本文に書かない
 * - 文言は平易な日本語。絵文字・記号アイコンは使わない
 */

/** キャッチコピーの一部分。`emphasis` が true の部分は紫で強調する（トップのヘルプモーダルと同じ配色）。 */
export interface CatchphraseSegment {
  text: string
  emphasis?: boolean
}

/**
 * ヒーローの h1 の行分け（ページ上の見出し。メタタイトルは `about-seo.ts` の「このサイトについて」のまま）。
 * 「サク／ッと」のような不自然な位置で折り返さないよう、表示側はこの行区切りで改行する。
 * 文言と配色はトップのヘルプモーダル（`Onboarding.tsx` の「戦場選びをサクッと10秒に。」）に揃える。
 */
export const ABOUT_CATCHPHRASE_LINES: readonly (readonly CatchphraseSegment[])[] = [
  [{ text: '戦場選びを' }],
  [{ text: 'サクッと' }, { text: '10秒', emphasis: true }, { text: 'に。' }],
]

/** ヒーローの h1 の全文（検索・テスト用。表示は {@link ABOUT_CATCHPHRASE_LINES} を改行付きで出す）。 */
export const ABOUT_CATCHPHRASE = ABOUT_CATCHPHRASE_LINES.map((line) => line.map((s) => s.text).join('')).join('')

/** ヒーローのサブ文（旧導入文を流用。正式名称は下半分の「対応タイトル」に残る）。 */
export const ABOUT_SUBCOPY =
  `${GAME_NAMES['jojo-ls'].short}・${GAME_NAMES['gundam-exvs'].short}の設置店舗を、` +
  '地図でまとめて確認できる非公式サイトです。'

/** 「地図を開く」ボタンの文言（ヒーローとまとめで共用）。 */
export const ABOUT_CTA_LABEL = '地図を開く'

/** 困りごと節の見出し（吹き出しの上に可視で置く）。 */
export const ABOUT_PAIN_HEADING = 'こんなときに使えます'

/**
 * 困りごとの吹き出し（スライドの吹き出しとアプリの機能をもとに 11 件）。語尾は「〜たい」で統一する。
 * 締めの一文は置かず、吹き出しだけで見せる。
 */
export const ABOUT_PAIN_POINTS: readonly string[] = [
  // 場所 → 集まり方 → 営業時間・設備 → 支払い → 行き方・共有 の順
  // （スマホ幅で 2 個ずつ折り返して揃うように、隣り合う文言の長さも見て並べている）
  '近くで遊びたい',
  '遠征先で遊びたい',
  '大人数で集まりたい',
  'ペア戦か知りたい',
  '営業時間を知りたい',
  '録画したい',
  '配信したい',
  '喫煙所がある店で遊びたい',
  '電子マネーで払いたい',
  '行き方を調べたい',
  '店を友だちに教えたい',
]

/** 嬉しいポイント節の見出し。 */
export const ABOUT_FEATURES_HEADING = '嬉しいポイント'

/** `public/about/` の画像 1 枚分のメタ情報（`<img>` の src / width / height / alt）。 */
export interface AboutImage {
  src: string
  width: number
  height: number
  alt: string
}

/**
 * LP で使う実機スクリーンショット（本番サイトを 375×812 の画面で撮影した WebP。端末枠は
 * {@link ../components/about/PhoneFrame} が CSS で付ける）。
 * 表示幅の 2 倍で書き出してある（ヒーロー 640px・ポイント 560px）。寸法は実ファイルの実寸。
 */
export const ABOUT_IMAGES = {
  hero: {
    src: '/about/hero-map.webp',
    width: 640,
    height: 1386,
    alt: '日本地図に全国の設置店舗が紫のピンで表示されたスマホ画面',
  },
  map: {
    src: '/about/feature-map.webp',
    width: 560,
    height: 1213,
    alt: '東京周辺の地図に設置店舗のピンと店舗数のまとまりが並んだスマホ画面',
  },
  filter: {
    src: '/about/feature-filter.webp',
    width: 560,
    height: 1213,
    alt: '絞り込み画面。ゲームタイトル・最低台数・録画台ありなどの条件を選んでいる',
  },
  detail: {
    src: '/about/feature-detail.webp',
    width: 560,
    height: 1213,
    alt: '店舗詳細画面。設置台数・営業時間・フロア・決済方法・録画台の有無が表示されている',
  },
} as const satisfies Record<string, AboutImage>

/** 嬉しいポイント 1 件分。`title` の改行（`\n`）は PC 幅でだけ改行として出す（スマホは自然に折り返す）。 */
export interface AboutFeature {
  title: string
  description: string
  image: AboutImage
}

/** 嬉しいポイント 3 つ（店舗数はデータ由来）。 */
export function aboutFeatures(totalStores: number): AboutFeature[] {
  return [
    {
      title: `全国${totalStores}店舗が一目でわかる`,
      description:
        '全国の設置店舗をGoogleマップに表示します。ピンの色で、どのタイトルが遊べる店かがすぐに分かります。',
      image: ABOUT_IMAGES.map,
    },
    {
      title: 'エリア・現在地・台数で\n簡単に絞り込める',
      description:
        `${GAME_NAMES['jojo-ls'].short}と${GAME_NAMES['gundam-exvs'].short}の切り替え、都道府県・市区町村での絞り込み、` +
        '現在地から近い店の検索に対応。台数・録画台・配信台・喫煙所の条件でも探せます。',
      image: ABOUT_IMAGES.filter,
    },
    {
      title: '出どころつきの情報で\n安心して行ける',
      description:
        '公式サイトの設置店舗一覧から自動で更新します。利用者からの報告は運営が確認してから反映し、' +
        '台数の出どころ（公式・みんなの報告・確認済み）を区別して表示します。',
      image: ABOUT_IMAGES.detail,
    },
  ]
}

/** まとめの一文（店舗数はデータ由来）。 */
export function aboutSummary(totalStores: number): string {
  return `全国${totalStores}店舗の信頼できる情報を、サクッと探せます。`
}
