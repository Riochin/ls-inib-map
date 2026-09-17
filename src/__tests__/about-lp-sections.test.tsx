import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AboutCtaLink } from '@/components/about/AboutCtaLink'
import { AboutHero } from '@/components/about/AboutHero'
import { AboutPainPoints } from '@/components/about/AboutPainPoints'
import { AboutFeatures } from '@/components/about/AboutFeatures'
import { AboutSummaryCta } from '@/components/about/AboutSummaryCta'
import {
  ABOUT_CATCHPHRASE,
  ABOUT_SUBCOPY,
  ABOUT_CTA_LABEL,
  ABOUT_IMAGES,
  ABOUT_PAIN_HEADING,
  ABOUT_PAIN_POINTS,
  ABOUT_FEATURES_HEADING,
  aboutFeatures,
  aboutSummary,
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
    const h1Text = (html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s/g, '')
    expect(h1Text).toBe(ABOUT_CATCHPHRASE)
  })

  it('「10秒」だけ紫で強調する（トップのヘルプモーダルと同じ配色）', () => {
    expect(html).toMatch(/<span class="text-purple-700">10秒<\/span>/)
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

describe('AboutPainPoints', () => {
  const html = renderToStaticMarkup(<AboutPainPoints />)

  it('見出し「こんなときに使えます」を可視の <h2> で出す', () => {
    expect(html).toMatch(new RegExp(`<h2[^>]*>${ABOUT_PAIN_HEADING}</h2>`))
    expect(html).not.toContain('sr-only')
  })

  it('吹き出し全件を <li> で出す', () => {
    expect((html.match(/<li/g) ?? []).length).toBe(ABOUT_PAIN_POINTS.length)
    for (const t of ABOUT_PAIN_POINTS) expect(html).toContain(t)
  })

  it('チップの色は薄い紫地・濃い紫文字で統一する（グレーチップを混ぜない）', () => {
    expect(html).not.toContain('bg-gray-100')
    expect((html.match(/bg-purple-50/g) ?? []).length).toBe(ABOUT_PAIN_POINTS.length)
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
    for (const f of aboutFeatures(760)) expect(html).toContain(f.title.split('\n')[0])
  })

  it('ポイント②③の見出しは PC 幅でだけ指定位置で改行する（スマホは自然に折り返す）', () => {
    expect(aboutFeatures(760)[1].title).toBe('エリア・現在地・台数で\n簡単に絞り込める')
    expect(aboutFeatures(760)[2].title).toBe('出どころつきの情報で\n安心して行ける')
    expect((html.match(/<br class="hidden md:inline"\/>/g) ?? []).length).toBe(2)
    expect(html).not.toContain('whitespace-pre-line')
  })

  it('3 つの見出しは「一目で」「簡単に」「安心して」で語調を揃える', () => {
    const titles = aboutFeatures(760).map((f) => f.title)
    expect(titles[0]).toContain('一目で')
    expect(titles[1]).toContain('簡単に')
    expect(titles[2]).toContain('安心して')
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
