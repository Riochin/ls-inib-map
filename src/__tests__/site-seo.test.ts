import { describe, it, expect } from 'vitest'
import { SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS, buildSiteJsonLd } from '@/lib/site-seo'
import { SITE_URL, GAME_NAMES, gameFullWithShort, gameShortWithAliases } from '@/lib/site-config'

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
  it('両タイトルの正式名称・通称・イニブの別名1つと店舗規模を含む', () => {
    expect(SITE_DESCRIPTION).toBe(
      'ジョジョの奇妙な冒険 ラストサバイバー（ラスサバ）と機動戦士ガンダム EXTREME VS.2 INFINITEBOOST（イニブ・インフィニットブースト）の設置・稼働店舗を、全国47都道府県・約760店舗から地図で検索。公式サイトから自動更新しています。',
    )
  })

  it('「設置」「稼働店舗」の両方の言い方を含む', () => {
    expect(SITE_DESCRIPTION).toContain('設置')
    expect(SITE_DESCRIPTION).toContain('稼働店舗')
  })

  it('前作の通称（オバブ）を含まない', () => {
    expect(SITE_DESCRIPTION).not.toContain('オバブ')
  })
})

describe('SITE_KEYWORDS', () => {
  it('両タイトルの通称・正式名称・全別名を含む', () => {
    for (const game of ['jojo-ls', 'gundam-exvs'] as const) {
      const n = GAME_NAMES[game]
      for (const word of [n.short, n.full, ...n.aliases]) {
        expect(SITE_KEYWORDS).toContain(word)
      }
    }
  })

  it('重複を含まない', () => {
    expect(new Set(SITE_KEYWORDS).size).toBe(SITE_KEYWORDS.length)
  })

  it('前作を含まない', () => {
    expect(SITE_KEYWORDS.join(' ')).not.toContain('オバブ')
    expect(SITE_KEYWORDS.join(' ')).not.toContain('OVERBOOST')
  })
})

describe('buildSiteJsonLd', () => {
  it('トップの画面に出ていない別名（alternateName）を付けない', () => {
    expect(JSON.stringify(buildSiteJsonLd())).not.toContain('alternateName')
  })

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

describe('GAME_NAMES', () => {
  it('検索の多い別名を先頭に置く（description は先頭から使う）', () => {
    expect(GAME_NAMES['gundam-exvs'].aliases.slice(0, 3)).toEqual(['インフィニットブースト', 'エクバ', 'EXVS2IB'])
    expect(GAME_NAMES['jojo-ls'].aliases[0]).toBe('ジョジョ ラストサバイバー')
  })

  it('別名に重複が無く、通称・正式名称と重ならない', () => {
    for (const game of ['jojo-ls', 'gundam-exvs'] as const) {
      const n = GAME_NAMES[game]
      expect(new Set(n.aliases).size).toBe(n.aliases.length)
      expect(n.aliases).not.toContain(n.short)
      expect(n.aliases).not.toContain(n.full)
    }
  })

  it('前作の通称は別名に入れない', () => {
    expect(GAME_NAMES['gundam-exvs'].aliases).not.toContain('オバブ')
    expect(GAME_NAMES['gundam-exvs'].predecessor?.short).toBe('オバブ')
  })
})

describe('gameFullWithShort / gameShortWithAliases', () => {
  it('別名数を省略すると「正式名称（通称）」を返す', () => {
    expect(gameFullWithShort('gundam-exvs')).toBe('機動戦士ガンダム EXTREME VS.2 INFINITEBOOST（イニブ）')
  })

  it('別名数を渡すと通称のあとに別名を足す', () => {
    expect(gameFullWithShort('gundam-exvs', 1)).toBe(
      '機動戦士ガンダム EXTREME VS.2 INFINITEBOOST（イニブ・インフィニットブースト）',
    )
  })

  it('「通称（別名・別名）」を返す', () => {
    expect(gameShortWithAliases('gundam-exvs', 2)).toBe('イニブ（インフィニットブースト・エクバ）')
    expect(gameShortWithAliases('jojo-ls', 1)).toBe('ラスサバ（ジョジョ ラストサバイバー）')
  })
})
