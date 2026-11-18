import { describe, it, expect } from 'vitest'
import { SITE_NAME, SITE_DESCRIPTION, buildSiteJsonLd } from '@/lib/site-seo'
import { SITE_URL } from '@/lib/site-config'

/**
 * トップページ（root layout）のメタ情報・構造化データを検証する。
 * タイトル名は GAME_NAMES から組み立てる（直書きしない）。
 */

describe('SITE_NAME', () => {
  it('サイト名を返す', () => {
    expect(SITE_NAME).toBe('ラスサバ・イニブ 設置店舗マップ')
  })
})

describe('SITE_DESCRIPTION', () => {
  it('両タイトルの正式名称・通称と店舗規模を含む', () => {
    expect(SITE_DESCRIPTION).toBe(
      'ジョジョの奇妙な冒険 ラストサバイバー（ラスサバ）と機動戦士ガンダム EXTREME VS.2 INFINITEBOOST（イニブ）の設置店舗を、全国47都道府県・約760店舗から地図で検索。公式サイトから自動更新しています。',
    )
  })
})

describe('buildSiteJsonLd', () => {
  it('サイトを WebApplication として宣言する', () => {
    expect(buildSiteJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'ReferenceApplication',
      operatingSystem: 'Web',
      inLanguage: 'ja',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    })
  })
})
