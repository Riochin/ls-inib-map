import { describe, it, expect } from 'vitest'
import {
  aboutTitle,
  aboutDescription,
  ABOUT_CANONICAL,
  ABOUT_SITE_URL,
  ABOUT_FAQ,
  buildAboutBreadcrumbJsonLd,
  buildAboutPageJsonLd,
  buildFaqPageJsonLd,
} from '@/lib/about-seo'
import { AUTHOR_NAME, X_URL, GAME_NAMES } from '@/lib/site-config'

describe('aboutTitle', () => {
  it('「このサイトについて」を返す（layout テンプレートで「｜サイト名」が付く）', () => {
    expect(aboutTitle()).toBe('このサイトについて')
  })
})

describe('aboutDescription', () => {
  it('両タイトルの正式名称と非公式の旨を含む', () => {
    const desc = aboutDescription()
    expect(desc).toContain(GAME_NAMES['jojo-ls'].full)
    expect(desc).toContain(GAME_NAMES['gundam-exvs'].full)
    expect(desc).toContain('非公式')
  })
})

describe('ABOUT_CANONICAL', () => {
  it('/about を指す', () => {
    expect(ABOUT_CANONICAL).toBe('/about')
  })
})

describe('buildAboutBreadcrumbJsonLd', () => {
  it('ホーム → このサイトについて の BreadcrumbList を返す', () => {
    const ld = buildAboutBreadcrumbJsonLd()
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement.map((e) => e.name)).toEqual(['ホーム', 'このサイトについて'])
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2])
    expect(ld.itemListElement[0].item).toBe(`${ABOUT_SITE_URL}/`)
    expect(ld.itemListElement[1].item).toBe(`${ABOUT_SITE_URL}/about`)
  })
})

describe('buildAboutPageJsonLd', () => {
  it('AboutPage に著者 Person を sameAs=X で紐づける', () => {
    const ld = buildAboutPageJsonLd()
    expect(ld['@type']).toBe('AboutPage')
    expect(ld.url).toBe(`${ABOUT_SITE_URL}/about`)
    expect(ld.author.name).toBe(AUTHOR_NAME)
    expect(ld.author.sameAs).toContain(X_URL)
  })

  it('店舗を LocalBusiness としてマークアップしない', () => {
    expect(JSON.stringify(buildAboutPageJsonLd())).not.toContain('LocalBusiness')
  })

  it('対応タイトルを VideoGame として、画面と同じ別名を alternateName に持つ', () => {
    const { about } = buildAboutPageJsonLd()
    expect(about).toHaveLength(2)
    for (const game of ['gundam-exvs', 'jojo-ls'] as const) {
      const n = GAME_NAMES[game]
      const entry = about.find((a) => a.name === n.full)
      expect(entry?.['@type']).toBe('VideoGame')
      expect(entry?.alternateName).toEqual([n.short, ...n.aliases])
    }
  })

  it('前作（オバブ）は alternateName に入れない', () => {
    expect(JSON.stringify(buildAboutPageJsonLd())).not.toContain('オバブ')
  })
})

describe('buildFaqPageJsonLd', () => {
  it('FAQPage を ABOUT_FAQ と同数の Question で返す', () => {
    const ld = buildFaqPageJsonLd()
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(ABOUT_FAQ.length)
    expect(ld.mainEntity[0]['@type']).toBe('Question')
    expect(ld.mainEntity[0].acceptedAnswer['@type']).toBe('Answer')
  })

  it('各 Question の本文が可視 FAQ（ABOUT_FAQ）と一致する', () => {
    const ld = buildFaqPageJsonLd()
    expect(ld.mainEntity.map((e) => e.name)).toEqual(ABOUT_FAQ.map((f) => f.q))
  })
})
