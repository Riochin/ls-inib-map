# `/about` LP風リデザイン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/about` の上半分を「キャッチコピー＋実機画像 → 困りごとの吹き出し → 嬉しいポイント3つ → まとめ＋ボタン」の LP 風にし、下半分は既存の説明・FAQ・免責をそのまま残す。

**Architecture:** 文言と画像メタ情報を `src/lib/about-copy.ts` に集約し、上半分を4つの同期・presentational コンポーネント（Hero / PainPoints / Features / SummaryCta）に分けて `AboutContent` が並べる。画像は `public/about/` の WebP を幅・高さ指定の素の `<img>` で出す。データ取得（店舗数）は既存どおり `src/app/about/page.tsx` がビルド時に集計して渡す。

**Tech Stack:** Next.js 16 App Router（SSG・Server Component）、React 19、Tailwind CSS 4、Vitest（`renderToStaticMarkup`）、cwebp（画像変換・開発機のみ）

## 実装後の変更（レビュー反映）

- Task 1 の画像は PDF 流用から **本番サイトの実撮影** に置き換えた（`scripts/shoot-about-screens.mjs`）。端末枠は `src/components/about/PhoneFrame.tsx` が CSS で付ける
- 「余白が不十分」の指摘を受け、LP ブロック間・ブロック内・about layout の余白を広げた
- ヒーローの h1 は `ABOUT_CATCHPHRASE_LINES`（「戦場選びを」／「サクッと10秒に。」）で改行位置を固定し、トップのヘルプモーダルと同じ配色（黒文字・「10秒」だけ紫）にした

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-09-17-about-lp-redesign-design.md`
- URL `/about`・メタタイトル「このサイトについて」・ディスクリプション・canonical・構造化データ（BreadcrumbList / AboutPage / FAQPage）は変更しない
- h1 はページ内に1つ（文言は「戦場選びをサクッと10秒に。」）
- 色: ブランド紫 `#7B2FBE`。見出しフォントは `CATCH_FONT_STYLE` / `HEADING_FONT_STYLE`（`src/lib/heading-font.ts`）
- UI 文言は平易な日本語。絵文字・記号アイコンは使わない（メモリ「UIはノンテック層前提」）
- サイト内リンクはクライアントJS非依存の素の `<a>`（`@next/next/no-html-link-for-pages` は行単位で無効化し理由を書く）
- 画像は `<img>` に `width` / `height` / `alt` を必ず付ける。`@next/next/no-img-element` は行単位で無効化し理由を書く
- 本文の店舗数はデータ由来（props）。スクショ内の固定数字「768」を本文に書かない
- パッケージ操作は pnpm のみ。コミットは各タスク末尾で行い、末尾に `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` を付ける
- dev / preview サーバーはこちらで起動しない

## ファイル構成

| 種別 | パス | 責務 |
|---|---|---|
| 追加 | `public/about/hero-map.webp` | ヒーロー用・表紙の日本地図スマホ画像（幅 640px） |
| 追加 | `public/about/feature-map.webp` | ポイント①・全国地図（幅 560px） |
| 追加 | `public/about/feature-filter.webp` | ポイント②・絞り込み画面（幅 560px） |
| 追加 | `public/about/feature-detail.webp` | ポイント③・店舗詳細（幅 560px） |
| 追加 | `src/lib/brand.ts` | ブランド紫の定数（新規コンポーネントと `AboutContent` が共用） |
| 追加 | `src/lib/about-copy.ts` | LP 部分の文言・画像メタ情報の単一ソース |
| 追加 | `src/components/about/AboutCtaLink.tsx` | 「地図を開く」ボタン（ヒーローとまとめで共用） |
| 追加 | `src/components/about/AboutHero.tsx` | ヒーロー |
| 追加 | `src/components/about/AboutPainPoints.tsx` | 困りごとの吹き出し＋締めの一文 |
| 追加 | `src/components/about/AboutFeatures.tsx` | 嬉しいポイント3つ |
| 追加 | `src/components/about/AboutSummaryCta.tsx` | まとめの帯＋ボタン |
| 変更 | `src/components/about/AboutContent.tsx` | 上半分を新コンポーネントに差し替え。「このサイトでできること」を削除 |
| 追加 | `src/__tests__/about-copy.test.ts` | 文言・画像メタのテスト |
| 追加 | `src/__tests__/about-lp-sections.test.tsx` | 4コンポーネントの描画テスト |
| 変更 | `src/__tests__/about-content.test.tsx` | h1 文言・CTA リンク数・固定数字なしの検証を追加 |

---

### Task 1: 画像を WebP に変換して配置

**Files:**
- Create: `public/about/hero-map.webp`, `public/about/feature-map.webp`, `public/about/feature-filter.webp`, `public/about/feature-detail.webp`

**Interfaces:**
- Produces: 4枚の画像の実寸（幅・高さ）。Task 2 の `ABOUT_IMAGES` にそのまま書く

素材は PDF から取り出した透過 PNG（scratchpad の `slides/` にある。無ければ `pypdf` で `20260711 ラスサバ・イニブ 設置店舗マップ紹介配信.pdf` の p1 / p11 / p12 / p13 から再抽出する）。

| 素材 | 元寸法 | 出力 | 幅 |
|---|---|---|---|
| `img_p1_X21.png`（表紙の日本地図） | 2057×3700 | `hero-map.webp` | 640 |
| `img_p11_X12.png`（全国地図・東京周辺） | 809×1620 | `feature-map.webp` | 560 |
| `img_p12_X12.png`（絞り込み） | 809×1620 | `feature-filter.webp` | 560 |
| `img_p13_X12.png`（店舗詳細） | 809×1620 | `feature-detail.webp` | 560 |

- [x] **Step 1: 変換**

```bash
S=/private/tmp/claude-501/-Users-irj0927-WorkSpace-ls-exvs-map/a197e4b1-d44f-4b93-b861-53d41ae55486/scratchpad/slides
mkdir -p public/about
cwebp -q 82 -resize 640 0 -alpha_q 90 "$S/img_p1_X21.png"  -o public/about/hero-map.webp
cwebp -q 82 -resize 560 0 -alpha_q 90 "$S/img_p11_X12.png" -o public/about/feature-map.webp
cwebp -q 82 -resize 560 0 -alpha_q 90 "$S/img_p12_X12.png" -o public/about/feature-filter.webp
cwebp -q 82 -resize 560 0 -alpha_q 90 "$S/img_p13_X12.png" -o public/about/feature-detail.webp
```

- [x] **Step 2: 寸法と容量を確認して記録**

```bash
for f in public/about/*.webp; do echo "$f $(sips -g pixelWidth -g pixelHeight $f | tail -2 | awk '{print $2}' | tr '\n' 'x') $(du -h $f | cut -f1)"; done
```

期待: 各 200KB 以下。幅は 640 / 560 / 560 / 560。高さ（例 1151 / 1121 / 1121 / 1121）を Task 2 の `ABOUT_IMAGES` に転記する。

- [x] **Step 3: コミット**

```bash
git add public/about
git commit -m "feat(about): LP用の実機スクリーンショット4枚を追加（WebP）"
```

---

### Task 2: ブランド色定数と LP 文言の単一ソース

**Files:**
- Create: `src/lib/brand.ts`
- Create: `src/lib/about-copy.ts`
- Test: `src/__tests__/about-copy.test.ts`

**Interfaces:**
- Produces:
  - `BRAND_PURPLE: '#7B2FBE'`
  - `ABOUT_CATCHPHRASE: string`, `ABOUT_SUBCOPY: string`, `ABOUT_CTA_LABEL: string`
  - `ABOUT_PAIN_POINTS: readonly string[]`（8件）, `ABOUT_PAIN_CLOSING: string`
  - `interface AboutImage { src: string; width: number; height: number; alt: string }`
  - `ABOUT_IMAGES: { hero: AboutImage; map: AboutImage; filter: AboutImage; detail: AboutImage }`
  - `interface AboutFeature { title: string; description: string; image: AboutImage }`
  - `aboutFeatures(totalStores: number): AboutFeature[]`（3件）
  - `aboutSummary(totalStores: number): string`
  - `ABOUT_FEATURES_HEADING: string`

- [x] **Step 1: 失敗するテストを書く**

`src/__tests__/about-copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  ABOUT_CATCHPHRASE,
  ABOUT_SUBCOPY,
  ABOUT_CTA_LABEL,
  ABOUT_PAIN_POINTS,
  ABOUT_PAIN_CLOSING,
  ABOUT_IMAGES,
  ABOUT_FEATURES_HEADING,
  aboutFeatures,
  aboutSummary,
} from '@/lib/about-copy'

/**
 * `/about` LP 部分の文言・画像メタ情報（単一ソース）を検証する。
 * 文言は平易な日本語で絵文字を含まず、店舗数はデータ由来（スクショの固定数字を書かない）。
 */

describe('about-copy — 固定文言', () => {
  it('キャッチコピー・サブ文・ボタン文言が空でない', () => {
    expect(ABOUT_CATCHPHRASE).toBe('戦場選びをサクッと10秒に')
    expect(ABOUT_SUBCOPY.length).toBeGreaterThan(0)
    expect(ABOUT_CTA_LABEL).toBe('地図を開く')
  })

  it('困りごとの吹き出しは 8 件で重複がない', () => {
    expect(ABOUT_PAIN_POINTS).toHaveLength(8)
    expect(new Set(ABOUT_PAIN_POINTS).size).toBe(8)
  })

  it('締めの一文は「作りました」で終わる', () => {
    expect(ABOUT_PAIN_CLOSING).toMatch(/作りました。$/)
  })
})

describe('about-copy — 画像メタ情報', () => {
  it('4 枚とも /about/ 配下の webp で、寸法と代替テキストを持つ', () => {
    for (const img of Object.values(ABOUT_IMAGES)) {
      expect(img.src).toMatch(/^\/about\/[a-z-]+\.webp$/)
      expect(img.width).toBeGreaterThan(0)
      expect(img.height).toBeGreaterThan(img.width) // 縦長のスマホ画面
      expect(img.alt.length).toBeGreaterThan(5)
    }
  })
})

describe('about-copy — 店舗数を受け取る文言', () => {
  it('嬉しいポイントは 3 件で、1 件目の見出しに店舗数を含む', () => {
    const features = aboutFeatures(760)
    expect(features).toHaveLength(3)
    expect(features[0].title).toContain('760')
    for (const f of features) {
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.description.length).toBeGreaterThan(0)
      expect(f.image.alt.length).toBeGreaterThan(0)
    }
  })

  it('まとめ文に店舗数を含む', () => {
    expect(aboutSummary(760)).toContain('760')
  })

  it('スクショ由来の固定数字「768」を文言に含まない', () => {
    const all = [
      ABOUT_CATCHPHRASE,
      ABOUT_SUBCOPY,
      ABOUT_PAIN_CLOSING,
      ABOUT_FEATURES_HEADING,
      ...ABOUT_PAIN_POINTS,
      ...aboutFeatures(760).flatMap((f) => [f.title, f.description]),
      aboutSummary(760),
    ].join('\n')
    expect(all).not.toContain('768')
  })

  it('絵文字を含まない（ノンテック層向けの平易な文言）', () => {
    const all = [
      ABOUT_CATCHPHRASE,
      ABOUT_SUBCOPY,
      ABOUT_PAIN_CLOSING,
      ...ABOUT_PAIN_POINTS,
      ...aboutFeatures(760).flatMap((f) => [f.title, f.description]),
      aboutSummary(760),
    ].join('\n')
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
```

- [x] **Step 2: 失敗を確認**

```bash
pnpm vitest run src/__tests__/about-copy.test.ts
```

期待: FAIL（`@/lib/about-copy` が見つからない）

- [x] **Step 3: 実装**

`src/lib/brand.ts`:

```ts
/**
 * ブランドカラーの単一ソース。
 *
 * 見出し・ボタン・リンクに使う紫。`layout.tsx` の themeColor / manifest と同じ値。
 * 既存の `AboutContent` / `SiteFooter` などはローカル定数で同値を持っているが、
 * 新規コンポーネントはこちらを import する。
 */
export const BRAND_PURPLE = '#7B2FBE'
```

`src/lib/about-copy.ts`（`ABOUT_IMAGES` の `height` は Task 1 Step 2 で確認した実寸に置き換える）:

```ts
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

/** ヒーローの h1（ページ上の見出し。メタタイトルは `about-seo.ts` の「このサイトについて」のまま）。 */
export const ABOUT_CATCHPHRASE = '戦場選びをサクッと10秒に'

/** ヒーローのサブ文（旧導入文を流用。正式名称は下半分の「対応タイトル」に残る）。 */
export const ABOUT_SUBCOPY =
  `${GAME_NAMES['jojo-ls'].short}・${GAME_NAMES['gundam-exvs'].short}の設置店舗を、` +
  '地図でまとめて確認できる非公式サイトです。'

/** 「地図を開く」ボタンの文言（ヒーローとまとめで共用）。 */
export const ABOUT_CTA_LABEL = '地図を開く'

/** 困りごとの吹き出し（スライドの吹き出しから 8 件を抜粋）。 */
export const ABOUT_PAIN_POINTS: readonly string[] = [
  '明日どこで集まる？',
  '録画台あったっけ？',
  '今日ってペア？',
  '何台ある？',
  '近くで遊びたい',
  '修学旅行先でラスサバしたいな',
  'あれ、駅から遠い',
  'PayPayしかない',
]

/** 吹き出しの締めの一文。 */
export const ABOUT_PAIN_CLOSING = '調べないといけないことが多すぎる。だから、作りました。'

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
 * LP で使う実機スクリーンショット（スマホ枠込み・透過 WebP）。
 * 表示幅の 2 倍で書き出してある（ヒーロー 640px・ポイント 560px）。
 */
export const ABOUT_IMAGES = {
  hero: {
    src: '/about/hero-map.webp',
    width: 640,
    height: 1151,
    alt: '日本地図に全国の設置店舗が紫のピンで表示されたスマホ画面',
  },
  map: {
    src: '/about/feature-map.webp',
    width: 560,
    height: 1121,
    alt: '東京周辺の地図に設置店舗のピンが並んだスマホ画面',
  },
  filter: {
    src: '/about/feature-filter.webp',
    width: 560,
    height: 1121,
    alt: '絞り込み画面。ゲームタイトル・最低台数・録画台ありなどの条件を選んでいる',
  },
  detail: {
    src: '/about/feature-detail.webp',
    width: 560,
    height: 1121,
    alt: '店舗詳細画面。設置台数・営業時間・フロア・決済方法・録画台の有無が表示されている',
  },
} as const satisfies Record<string, AboutImage>

/** 嬉しいポイント 1 件分。 */
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
      title: 'タイトル・エリア・現在地でサクッと絞り込める',
      description:
        `${GAME_NAMES['jojo-ls'].short}と${GAME_NAMES['gundam-exvs'].short}の切り替え、都道府県・市区町村での絞り込み、` +
        '現在地から近い店の検索に対応。台数・録画台・配信台・喫煙所の条件でも探せます。',
      image: ABOUT_IMAGES.filter,
    },
    {
      title: '情報の確からしさがわかる',
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
```

- [x] **Step 4: テストが通ることを確認**

```bash
pnpm vitest run src/__tests__/about-copy.test.ts
```

期待: PASS（7 件）

- [x] **Step 5: コミット**

```bash
git add src/lib/brand.ts src/lib/about-copy.ts src/__tests__/about-copy.test.ts
git commit -m "feat(about): LP文言・画像メタ情報の単一ソース about-copy.ts を追加"
```

---

### Task 3: CTA ボタンとヒーロー

**Files:**
- Create: `src/components/about/AboutCtaLink.tsx`
- Create: `src/components/about/AboutHero.tsx`
- Test: `src/__tests__/about-lp-sections.test.tsx`（新規。Task 4〜5 で追記する）

**Interfaces:**
- Consumes: `ABOUT_CATCHPHRASE`, `ABOUT_SUBCOPY`, `ABOUT_CTA_LABEL`, `ABOUT_IMAGES.hero`（Task 2）、`BRAND_PURPLE`（Task 2）、`CATCH_FONT_STYLE`（既存 `src/lib/heading-font.ts`）
- Produces: `AboutCtaLink(): JSX`（props なし・`<a href="/">`）、`AboutHero(): JSX`（props なし・h1 を含む）

- [x] **Step 1: 失敗するテストを書く**

`src/__tests__/about-lp-sections.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AboutCtaLink } from '@/components/about/AboutCtaLink'
import { AboutHero } from '@/components/about/AboutHero'
import {
  ABOUT_CATCHPHRASE,
  ABOUT_SUBCOPY,
  ABOUT_CTA_LABEL,
  ABOUT_IMAGES,
} from '@/lib/about-copy'

/**
 * `/about` LP 部分の各セクション（同期・presentational）を個別に検証する。
 * 文言は `about-copy.ts` を単一ソースとし、ここでは「その文言が正しい場所に出るか」を見る。
 */

describe('AboutCtaLink', () => {
  it('地図トップ（/）へのリンクでボタン文言を出す', () => {
    const html = renderToStaticMarkup(<AboutCtaLink />)
    expect(html).toContain('href="/"')
    expect(html).toContain(ABOUT_CTA_LABEL)
  })
})

describe('AboutHero', () => {
  const html = renderToStaticMarkup(<AboutHero />)

  it('キャッチコピーを単一の <h1> に出す', () => {
    expect((html.match(/<h1/g) ?? []).length).toBe(1)
    expect(html).toMatch(new RegExp(`<h1[^>]*>${ABOUT_CATCHPHRASE}</h1>`))
  })

  it('サブ文と「地図を開く」ボタンを出す', () => {
    expect(html).toContain(ABOUT_SUBCOPY)
    expect(html).toContain('href="/"')
    expect(html).toContain(ABOUT_CTA_LABEL)
  })

  it('表紙画像を寸法・代替テキスト付きで優先読み込みにする', () => {
    const { src, width, height, alt } = ABOUT_IMAGES.hero
    expect(html).toContain(`src="${src}"`)
    expect(html).toContain(`width="${width}"`)
    expect(html).toContain(`height="${height}"`)
    expect(html).toContain(`alt="${alt}"`)
    expect(html).toMatch(/fetchpriority="high"/i) // React は fetchPriority を camelCase のまま出力する
    expect(html).not.toContain('loading="lazy"')
  })
})
```

- [x] **Step 2: 失敗を確認**

```bash
pnpm vitest run src/__tests__/about-lp-sections.test.tsx
```

期待: FAIL（コンポーネントが見つからない）

- [x] **Step 3: 実装**

`src/components/about/AboutCtaLink.tsx`:

```tsx
import { ABOUT_CTA_LABEL } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'

/**
 * 「地図を開く」ボタン（`/about` のヒーローとまとめで共用・同期・presentational）。
 *
 * 地図トップ `/` への素の `<a>`。静的 SEO ページのためクライアント JS 非依存（area ページと同方針）。
 * スマホでは横幅いっぱい・高さ 3rem で押しやすくし、PC 幅では内容幅にする。
 */
export function AboutCtaLink() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- 静的SEOページのため素の<a>を使う
    <a
      href="/"
      className="inline-flex h-12 w-full items-center justify-center rounded-full px-8 text-base font-bold text-white transition-opacity hover:opacity-90 md:w-auto"
      style={{ backgroundColor: BRAND_PURPLE }}
    >
      {ABOUT_CTA_LABEL}
    </a>
  )
}
```

`src/components/about/AboutHero.tsx`:

```tsx
import { CATCH_FONT_STYLE } from '@/lib/heading-font'
import { ABOUT_CATCHPHRASE, ABOUT_SUBCOPY, ABOUT_IMAGES } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'
import { AboutCtaLink } from '@/components/about/AboutCtaLink'

/**
 * `/about` のヒーロー（同期・presentational）。
 *
 * ページ唯一の `<h1>`（キャッチコピー）・サブ文・「地図を開く」ボタン・表紙の日本地図スマホ画像。
 * スマホは縦積み（コピー → サブ文 → ボタン → 画像）、PC 幅（md 以上）は左に文章・右に画像。
 * 画像の後ろにだけ薄い紫のぼかしを敷いて浮かせる。ヒーロー画像は初回表示に必要なので
 * `fetchPriority="high"`（遅延読み込みしない）。
 */
export function AboutHero() {
  const hero = ABOUT_IMAGES.hero
  return (
    <section aria-labelledby="about-hero-title" className="grid gap-8 md:grid-cols-2 md:items-center">
      <div>
        <h1
          id="about-hero-title"
          className="text-4xl leading-tight"
          style={{ ...CATCH_FONT_STYLE, color: BRAND_PURPLE }}
        >
          {ABOUT_CATCHPHRASE}
        </h1>
        <p className="mt-3 text-gray-700 leading-relaxed">{ABOUT_SUBCOPY}</p>
        <div className="mt-6">
          <AboutCtaLink />
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-[320px]">
        <div aria-hidden="true" className="absolute inset-x-6 inset-y-10 rounded-full bg-purple-100 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element -- 寸法固定の静的WebP。next/image を使わずクライアントJS非依存にする */}
        <img
          src={hero.src}
          width={hero.width}
          height={hero.height}
          alt={hero.alt}
          fetchPriority="high"
          className="relative h-auto w-full"
        />
      </div>
    </section>
  )
}
```

- [x] **Step 4: テストが通ることを確認**

```bash
pnpm vitest run src/__tests__/about-lp-sections.test.tsx
```

期待: PASS（4 件）

- [x] **Step 5: コミット**

```bash
git add src/components/about/AboutCtaLink.tsx src/components/about/AboutHero.tsx src/__tests__/about-lp-sections.test.tsx
git commit -m "feat(about): ヒーローと「地図を開く」ボタンを追加"
```

---

### Task 4: 困りごとの吹き出しと嬉しいポイント3つ

**Files:**
- Create: `src/components/about/AboutPainPoints.tsx`
- Create: `src/components/about/AboutFeatures.tsx`
- Modify: `src/__tests__/about-lp-sections.test.tsx`（末尾に追記）

**Interfaces:**
- Consumes: `ABOUT_PAIN_POINTS`, `ABOUT_PAIN_CLOSING`, `ABOUT_FEATURES_HEADING`, `aboutFeatures(totalStores)`（Task 2）、`BRAND_PURPLE`、`HEADING_FONT_STYLE`
- Produces: `AboutPainPoints(): JSX`（props なし）、`AboutFeatures({ totalStores: number }): JSX`

- [x] **Step 1: 失敗するテストを追記**

`src/__tests__/about-lp-sections.test.tsx` の import に追加:

```tsx
import { AboutPainPoints } from '@/components/about/AboutPainPoints'
import { AboutFeatures } from '@/components/about/AboutFeatures'
import { ABOUT_PAIN_POINTS, ABOUT_PAIN_CLOSING, ABOUT_FEATURES_HEADING, aboutFeatures } from '@/lib/about-copy'
```

（既存の `about-copy` import と1つにまとめてよい）末尾に追記:

```tsx
describe('AboutPainPoints', () => {
  const html = renderToStaticMarkup(<AboutPainPoints />)

  it('吹き出し 8 件を <li> で出す', () => {
    expect((html.match(/<li/g) ?? []).length).toBe(ABOUT_PAIN_POINTS.length)
    for (const t of ABOUT_PAIN_POINTS) expect(html).toContain(t)
  })

  it('締めの一文を出す', () => {
    expect(html).toContain(ABOUT_PAIN_CLOSING)
  })

  it('<h1> を持たない（h1 はヒーローだけ）', () => {
    expect(html).not.toContain('<h1')
  })
})

describe('AboutFeatures', () => {
  const html = renderToStaticMarkup(<AboutFeatures totalStores={760} />)

  it('節見出しと 3 つのポイント見出し（<h3>）を出す', () => {
    expect(html).toContain(ABOUT_FEATURES_HEADING)
    expect((html.match(/<h3/g) ?? []).length).toBe(3)
    for (const f of aboutFeatures(760)) expect(html).toContain(f.title)
  })

  it('店舗数を props から反映する', () => {
    expect(html).toContain('全国760店舗')
    expect(html).not.toContain('768')
  })

  it('スクショ 3 枚を寸法・代替テキスト付きの遅延読み込みで出す', () => {
    expect((html.match(/<img/g) ?? []).length).toBe(3)
    expect((html.match(/loading="lazy"/g) ?? []).length).toBe(3)
    for (const f of aboutFeatures(760)) {
      expect(html).toContain(`src="${f.image.src}"`)
      expect(html).toContain(`alt="${f.image.alt}"`)
      expect(html).toContain(`width="${f.image.width}"`)
    }
  })

  it('番号は読み上げ用テキストでも伝える', () => {
    expect(html).toContain('ポイント1')
    expect(html).toContain('ポイント3')
  })
})
```

- [x] **Step 2: 失敗を確認**

```bash
pnpm vitest run src/__tests__/about-lp-sections.test.tsx
```

期待: FAIL（`AboutPainPoints` / `AboutFeatures` が見つからない）

- [x] **Step 3: 実装**

`src/components/about/AboutPainPoints.tsx`:

```tsx
import { ABOUT_PAIN_POINTS, ABOUT_PAIN_CLOSING } from '@/lib/about-copy'

/**
 * 困りごとの吹き出し（同期・presentational）。
 *
 * 紹介配信スライドの「調べないといけないことが多すぎる」の導入を再現する。角丸チップを
 * 横に流して折り返し、薄い紫と薄いグレーを交互に並べて雑談の空気を出す。締めの一文は太字・中央寄せ。
 * 見出しはスクリーンリーダー用に `sr-only` で持ち、視覚上は吹き出しから始める。
 */
export function AboutPainPoints() {
  return (
    <section aria-labelledby="about-pain-title">
      <h2 id="about-pain-title" className="sr-only">
        こんな困りごと、ありませんか
      </h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {ABOUT_PAIN_POINTS.map((text, i) => (
          <li
            key={text}
            className={
              'rounded-full px-4 py-2 text-sm ' +
              (i % 2 === 0 ? 'bg-purple-50 text-purple-900' : 'bg-gray-100 text-gray-800')
            }
          >
            {text}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center font-bold text-gray-900 leading-relaxed">{ABOUT_PAIN_CLOSING}</p>
    </section>
  )
}
```

`src/components/about/AboutFeatures.tsx`:

```tsx
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { ABOUT_FEATURES_HEADING, aboutFeatures } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'

interface AboutFeaturesProps {
  /** 掲載中の営業店舗の総数（ポイント①の見出しに使う。データ由来）。 */
  totalStores: number
}

/**
 * 嬉しいポイント 3 つ（同期・presentational）。
 *
 * 各ポイントは「番号バッジ＋見出し（h3）＋説明＋実機スクショ」。スマホは縦積み、PC 幅（md 以上）は
 * 画像と文章を左右交互に置く。スクショは初回表示に不要なので `loading="lazy"`。
 * 番号バッジは装飾扱い（aria-hidden）にし、見出し内の `sr-only` テキストで読み上げに番号を伝える。
 */
export function AboutFeatures({ totalStores }: AboutFeaturesProps) {
  const features = aboutFeatures(totalStores)
  return (
    <section aria-labelledby="about-features-title" className="flex flex-col gap-10">
      <h2
        id="about-features-title"
        className="text-center text-xl"
        style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}
      >
        {ABOUT_FEATURES_HEADING}
      </h2>
      {features.map((f, i) => (
        <article key={f.title} className="grid gap-4 md:grid-cols-2 md:items-center">
          <div className={i % 2 === 1 ? 'md:order-2' : undefined}>
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: BRAND_PURPLE }}
            >
              {i + 1}
            </span>
            <h3 className="mt-2 text-lg" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
              <span className="sr-only">ポイント{i + 1}：</span>
              {f.title}
            </h3>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{f.description}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- 寸法固定の静的WebP。next/image を使わずクライアントJS非依存にする */}
          <img
            src={f.image.src}
            width={f.image.width}
            height={f.image.height}
            alt={f.image.alt}
            loading="lazy"
            className="mx-auto h-auto w-full max-w-[280px]"
          />
        </article>
      ))}
    </section>
  )
}
```

- [x] **Step 4: テストが通ることを確認**

```bash
pnpm vitest run src/__tests__/about-lp-sections.test.tsx
```

期待: PASS（11 件）

- [x] **Step 5: コミット**

```bash
git add src/components/about/AboutPainPoints.tsx src/components/about/AboutFeatures.tsx src/__tests__/about-lp-sections.test.tsx
git commit -m "feat(about): 困りごとの吹き出しと嬉しいポイント3つを追加"
```

---

### Task 5: まとめの帯＋ボタン

**Files:**
- Create: `src/components/about/AboutSummaryCta.tsx`
- Modify: `src/__tests__/about-lp-sections.test.tsx`（末尾に追記）

**Interfaces:**
- Consumes: `aboutSummary(totalStores)`（Task 2）、`AboutCtaLink`（Task 3）、`HEADING_FONT_STYLE`、`BRAND_PURPLE`
- Produces: `AboutSummaryCta({ totalStores: number }): JSX`

- [x] **Step 1: 失敗するテストを追記**

import に追加:

```tsx
import { AboutSummaryCta } from '@/components/about/AboutSummaryCta'
import { aboutSummary } from '@/lib/about-copy'
```

末尾に追記:

```tsx
describe('AboutSummaryCta', () => {
  const html = renderToStaticMarkup(<AboutSummaryCta totalStores={760} />)

  it('まとめ文（店舗数入り）と「地図を開く」ボタンを出す', () => {
    expect(html).toContain(aboutSummary(760))
    expect(html).toContain('href="/"')
  })

  it('<h1> を持たない', () => {
    expect(html).not.toContain('<h1')
  })
})
```

- [x] **Step 2: 失敗を確認**

```bash
pnpm vitest run src/__tests__/about-lp-sections.test.tsx
```

期待: FAIL（`AboutSummaryCta` が見つからない）

- [x] **Step 3: 実装**

`src/components/about/AboutSummaryCta.tsx`:

```tsx
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { aboutSummary } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'
import { AboutCtaLink } from '@/components/about/AboutCtaLink'

interface AboutSummaryCtaProps {
  /** 掲載中の営業店舗の総数（まとめ文に使う。データ由来）。 */
  totalStores: number
}

/**
 * まとめの帯＋2 回目の「地図を開く」ボタン（同期・presentational）。
 * 薄い紫の帯で視線を一度止め、LP 部分の締めにする。この下に既存の説明・FAQ が続く。
 */
export function AboutSummaryCta({ totalStores }: AboutSummaryCtaProps) {
  return (
    <section aria-labelledby="about-summary-title" className="rounded-2xl bg-purple-50 px-5 py-7 text-center">
      <h2
        id="about-summary-title"
        className="text-lg leading-relaxed"
        style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}
      >
        {aboutSummary(totalStores)}
      </h2>
      <div className="mt-5 flex justify-center">
        <AboutCtaLink />
      </div>
    </section>
  )
}
```

- [x] **Step 4: テストが通ることを確認**

```bash
pnpm vitest run src/__tests__/about-lp-sections.test.tsx
```

期待: PASS（13 件）

- [x] **Step 5: コミット**

```bash
git add src/components/about/AboutSummaryCta.tsx src/__tests__/about-lp-sections.test.tsx
git commit -m "feat(about): まとめの帯と2回目の「地図を開く」ボタンを追加"
```

---

### Task 6: AboutContent に組み込み、旧ヘッダーと「できること」を置き換え

**Files:**
- Modify: `src/components/about/AboutContent.tsx`
- Modify: `src/__tests__/about-content.test.tsx`

**Interfaces:**
- Consumes: `AboutHero`, `AboutPainPoints`, `AboutFeatures`, `AboutSummaryCta`（Task 3〜5）、`ABOUT_CATCHPHRASE`（Task 2）、`BRAND_PURPLE`（Task 2）
- Produces: `AboutContent` の props は変更なし（`lastUpdated` / `totalStores` / `prefectureCount` / `popularAreas`）

- [x] **Step 1: 失敗するテストを追記**

`src/__tests__/about-content.test.tsx` の import に追加:

```tsx
import { ABOUT_CATCHPHRASE, ABOUT_PAIN_CLOSING } from '@/lib/about-copy'
```

`describe('AboutContent — 構造')` の中に追記:

```tsx
  it('<h1> の文言はキャッチコピー', () => {
    expect(render()).toMatch(new RegExp(`<h1[^>]*>${ABOUT_CATCHPHRASE}</h1>`))
  })
```

末尾に追記:

```tsx
describe('AboutContent — LP 部分', () => {
  it('地図トップ（/）へのリンクをパンくず・ヒーロー・まとめ・フッターの計 4 つ持つ', () => {
    expect((render().match(/href="\/"/g) ?? []).length).toBe(4)
  })

  it('困りごとの締めの一文と嬉しいポイント 3 つ（<h3>）を出す', () => {
    const html = render()
    expect(html).toContain(ABOUT_PAIN_CLOSING)
    expect((html.match(/<h3/g) ?? []).length).toBe(3)
  })

  it('スクショ 4 枚すべてに代替テキストがある', () => {
    const html = render()
    const imgs = html.match(/<img[^>]*>/g) ?? []
    expect(imgs.length).toBe(4)
    for (const tag of imgs) expect(tag).toMatch(/alt="[^"]+"/)
  })

  it('旧「このサイトでできること」節は出さない（ポイント 3 つと重複するため）', () => {
    expect(render()).not.toContain('このサイトでできること')
  })

  it('スクショ由来の固定数字「768」を本文に含まない', () => {
    expect(render()).not.toContain('768')
  })
})
```

- [x] **Step 2: 失敗を確認**

```bash
pnpm vitest run src/__tests__/about-content.test.tsx
```

期待: FAIL（h1 文言・リンク数・h3 数などが不一致）

- [x] **Step 3: 実装**

`src/components/about/AboutContent.tsx` を次のように変更する。

import の変更:

```tsx
// 削除
import { CATCH_FONT_STYLE, HEADING_FONT_STYLE } from '@/lib/heading-font'
import { aboutTitle, ABOUT_FAQ, buildAboutBreadcrumbJsonLd, buildAboutPageJsonLd, buildFaqPageJsonLd } from '@/lib/about-seo'
// 追加・置換
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { ABOUT_FAQ, buildAboutBreadcrumbJsonLd, buildAboutPageJsonLd, buildFaqPageJsonLd } from '@/lib/about-seo'
import { BRAND_PURPLE } from '@/lib/brand'
import { AboutHero } from '@/components/about/AboutHero'
import { AboutPainPoints } from '@/components/about/AboutPainPoints'
import { AboutFeatures } from '@/components/about/AboutFeatures'
import { AboutSummaryCta } from '@/components/about/AboutSummaryCta'
```

`site-config` の import から `gameFullWithShort` を外す（ヘッダーの導入文で使っていたもの。他で未使用なら削除）。

ローカル定数 `const BRAND_PURPLE = '#7B2FBE'` と `const FEATURES: string[] = [...]` を削除する。

docblock を更新:

```tsx
/**
 * `/about`（このアプリについて）の本文（同期・presentational）。
 *
 * データ取得は親（`page.tsx`）が担い、本コンポーネントは描画のみ（SSR レンダリングで
 * 単体テスト可能にするため非同期処理を持たない）。
 *
 * 上半分は LP（ヒーロー → 困りごとの吹き出し → 嬉しいポイント3つ → まとめ＋ボタン。
 * X で初めてリンクを見た人向け。文言は `about-copy.ts`）、下半分は検索・信頼性向けの
 * 説明（対応タイトル・データについて・FAQ・エリア導線・プライバシー・免責・開発者情報）。
 * 下半分はオンボーディングモーダルと同じ事実を {@link ../../lib/site-config} から共有する。
 */
```

JSX の `<header>…</header>` ブロック（h1 と導入文）を次に置き換える:

```tsx
      <div className="flex flex-col gap-12">
        <AboutHero />
        <AboutPainPoints />
        <AboutFeatures totalStores={totalStores} />
        <AboutSummaryCta totalStores={totalStores} />
      </div>

      <hr className="border-purple-100" />
```

`<section>` の「このサイトでできること」（`FEATURES.map` を含む節）を丸ごと削除する。それ以外（対応タイトル・データについて・FAQ・エリアから探す・プライバシー・免責・開発者・フッター・JSON-LD）はそのまま。

- [x] **Step 4: テストが通ることを確認**

```bash
pnpm vitest run src/__tests__/about-content.test.tsx src/__tests__/about-lp-sections.test.tsx src/__tests__/about-copy.test.ts
```

期待: PASS（すべて）

- [x] **Step 5: コミット**

```bash
git add src/components/about/AboutContent.tsx src/__tests__/about-content.test.tsx
git commit -m "feat(about): 上半分をLP構成に差し替え、「このサイトでできること」を統合"
```

---

### Task 7: 全体検証

**Files:** 変更なし（検証のみ）

- [x] **Step 1: 型・lint・全テスト**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

期待: tsc エラーなし。lint は新規ファイル由来の warning が 0（`no-img-element` / `no-html-link-for-pages` は行単位で無効化済み）。テストは全件 PASS。

- [x] **Step 2: ビルドと HTML 検証**

```bash
pnpm build && grep -o '<h1' .next/server/app/about.html | wc -l && grep -oE 'href="/"' .next/server/app/about.html | wc -l && grep -oE 'src="/about/[^"]+"' .next/server/app/about.html | sort -u && grep -o '<script type="application/ld+json"' .next/server/app/about.html | wc -l
```

期待: h1 = 1、`href="/"` = 4（パンくず・ヒーロー・まとめ・フッター）、画像 4 種、JSON-LD スクリプト 4 本（root layout の WebApplication ＋ Breadcrumb / AboutPage / FAQPage）。

- [x] **Step 3: メタタグが据え置きであることを確認**

```bash
grep -oE '<title>[^<]*</title>|<link rel="canonical"[^>]*>' .next/server/app/about.html
```

期待: `<title>このサイトについて｜ラスサバ・イニブ 設置店舗マップ</title>`、canonical は `https://lsib.world/about`。

- [x] **Step 4: 見た目の確認はユーザーに依頼**

dev サーバーはこちらで起動しない。ユーザーが `pnpm dev` で立てた後、`/about` をスマホ幅（375px）と PC 幅で確認してもらう。修正があれば Task 3〜6 の該当ファイルを直し、Step 1〜2 を再実行する。
