import { describe, it, expect } from 'vitest'
import {
  ABOUT_CATCHPHRASE,
  ABOUT_SUBCOPY,
  ABOUT_CTA_LABEL,
  ABOUT_PAIN_HEADING,
  ABOUT_PAIN_POINTS,
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
    expect(ABOUT_CATCHPHRASE).toBe('戦場選びをサクッと10秒に。')
    expect(ABOUT_SUBCOPY.length).toBeGreaterThan(0)
    expect(ABOUT_CTA_LABEL).toBe('地図を開く')
  })

  it('困りごとの吹き出しは 11 件で重複がない', () => {
    expect(ABOUT_PAIN_POINTS).toHaveLength(11)
    expect(new Set(ABOUT_PAIN_POINTS).size).toBe(11)
  })

  it('吹き出しの語尾は「たい」で統一する', () => {
    for (const t of ABOUT_PAIN_POINTS) expect(t).toMatch(/たい$/)
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
          ABOUT_FEATURES_HEADING,
      ABOUT_PAIN_HEADING,
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
          ...ABOUT_PAIN_POINTS,
      ...aboutFeatures(760).flatMap((f) => [f.title, f.description]),
      aboutSummary(760),
    ].join('\n')
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
