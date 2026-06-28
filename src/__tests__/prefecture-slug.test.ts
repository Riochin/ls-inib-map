import { describe, it, expect } from 'vitest'
import {
  PREFECTURE_SLUGS,
  slugToPrefecture,
  prefectureToSlug,
} from '@/lib/prefecture-slug'
import { PREFECTURES } from '@/lib/address-parser'

describe('PREFECTURE_SLUGS', () => {
  it('キー集合が PREFECTURES と完全一致する（過不足なし）', () => {
    const keys = Object.keys(PREFECTURE_SLUGS).sort()
    const prefs = [...PREFECTURES].sort()
    expect(keys).toEqual(prefs)
  })

  it('47件すべてに対応がある', () => {
    expect(Object.keys(PREFECTURE_SLUGS)).toHaveLength(47)
  })

  it('スラッグに重複が無い', () => {
    const slugs = Object.values(PREFECTURE_SLUGS)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('スラッグは小文字英字のみ（ハイフン不使用）', () => {
    for (const slug of Object.values(PREFECTURE_SLUGS)) {
      expect(slug).toMatch(/^[a-z]+$/)
    }
  })

  it('代表的な対応が正しい', () => {
    expect(PREFECTURE_SLUGS['北海道']).toBe('hokkaido')
    expect(PREFECTURE_SLUGS['東京都']).toBe('tokyo')
    expect(PREFECTURE_SLUGS['大阪府']).toBe('osaka')
    expect(PREFECTURE_SLUGS['神奈川県']).toBe('kanagawa')
    expect(PREFECTURE_SLUGS['京都府']).toBe('kyoto')
  })
})

describe('slugToPrefecture / prefectureToSlug', () => {
  it('スラッグ→正式名に変換できる', () => {
    expect(slugToPrefecture('tokyo')).toBe('東京都')
    expect(slugToPrefecture('fukuoka')).toBe('福岡県')
  })

  it('正式名→スラッグに変換できる', () => {
    expect(prefectureToSlug('東京都')).toBe('tokyo')
    expect(prefectureToSlug('福岡県')).toBe('fukuoka')
  })

  it('未知の値には null を返す', () => {
    expect(slugToPrefecture('atlantis')).toBeNull()
    expect(slugToPrefecture('')).toBeNull()
    expect(prefectureToSlug('幻の国')).toBeNull()
    expect(prefectureToSlug('')).toBeNull()
  })

  it('双方向変換が往復で元に戻る', () => {
    for (const pref of PREFECTURES) {
      const slug = prefectureToSlug(pref)
      expect(slug).not.toBeNull()
      expect(slugToPrefecture(slug as string)).toBe(pref)
    }
  })
})
