import { describe, it, expect } from 'vitest'
import { REGIONS, regionOfPrefecture, prefecturesOfRegion } from '@/lib/region'
import { PREFECTURES } from '@/lib/address-parser'

describe('regionOfPrefecture', () => {
  it('東京都は関東', () => {
    expect(regionOfPrefecture('東京都')).toBe('関東')
  })

  it('大阪府は近畿', () => {
    expect(regionOfPrefecture('大阪府')).toBe('近畿')
  })

  it('北海道は北海道', () => {
    expect(regionOfPrefecture('北海道')).toBe('北海道')
  })

  it('沖縄県は九州沖縄', () => {
    expect(regionOfPrefecture('沖縄県')).toBe('九州沖縄')
  })

  it('三重県は近畿（8地方区分）', () => {
    expect(regionOfPrefecture('三重県')).toBe('近畿')
  })

  it('未知の都道府県名は null', () => {
    expect(regionOfPrefecture('存在しない県')).toBeNull()
    expect(regionOfPrefecture('')).toBeNull()
  })

  it('全47都道府県がいずれかの地方に属する（網羅性）', () => {
    expect(PREFECTURES.every((p) => regionOfPrefecture(p) !== null)).toBe(true)
  })
})

describe('prefecturesOfRegion', () => {
  it('関東は茨城〜神奈川の7県を含む', () => {
    const kanto = prefecturesOfRegion('関東')
    expect(kanto).toEqual([
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    ])
  })

  it('PREFECTURES の並び順を保つ', () => {
    const tohoku = prefecturesOfRegion('東北')
    expect(tohoku[0]).toBe('青森県')
    expect(tohoku[tohoku.length - 1]).toBe('福島県')
  })

  it('不明な地方名は空配列', () => {
    expect(prefecturesOfRegion('架空地方')).toEqual([])
  })

  it('全地方の都道府県を合算すると47件・重複なし', () => {
    const all = REGIONS.flatMap((r) => prefecturesOfRegion(r))
    expect(all).toHaveLength(47)
    expect(new Set(all).size).toBe(47)
  })
})
