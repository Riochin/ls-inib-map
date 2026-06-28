import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AboutContent } from '@/components/about/AboutContent'
import type { AreaSummary } from '@/lib/area'
import { DISCLAIMER, PRIVACY_NOTE, X_URL, GAME_NAMES } from '@/lib/site-config'
import { ABOUT_FAQ } from '@/lib/about-seo'

/**
 * `/about` の本文（presentational）を検証する。
 * 単一 <h1>・正式名称の展開・共有文言・FAQ・カバレッジ・サイト内/エリアリンクを担保する。
 */

const popularAreas: AreaSummary[] = [
  { prefecture: '東京都', slug: 'tokyo', total: 12, countByGame: { 'gundam-exvs': 9, 'jojo-ls': 8 } },
  { prefecture: '大阪府', slug: 'osaka', total: 7, countByGame: { 'gundam-exvs': 5, 'jojo-ls': 4 } },
]

function render(lastUpdated?: string | null): string {
  return renderToStaticMarkup(
    <AboutContent
      lastUpdated={lastUpdated}
      totalStores={760}
      prefectureCount={42}
      popularAreas={popularAreas}
    />,
  )
}

describe('AboutContent — 構造', () => {
  it('単一の <h1> を出力する', () => {
    expect((render().match(/<h1/g) ?? []).length).toBe(1)
  })

  it('共有文言（免責・プライバシー）を出力する', () => {
    const html = render()
    expect(html).toContain(DISCLAIMER)
    expect(html).toContain(PRIVACY_NOTE)
  })

  it('開発者の X プロフィールへリンクする', () => {
    expect(render()).toContain(`href="${X_URL}"`)
  })
})

describe('AboutContent — 正式名称の展開', () => {
  it('両タイトルの正式名称を出力する', () => {
    const html = render()
    expect(html).toContain(GAME_NAMES['jojo-ls'].full)
    expect(html).toContain(GAME_NAMES['gundam-exvs'].full)
  })

  it('別名（検索表記）を出力する', () => {
    expect(render()).toContain('EXVS2')
  })
})

describe('AboutContent — FAQ', () => {
  it('全 FAQ の質問を出力する', () => {
    const html = render()
    for (const f of ABOUT_FAQ) {
      expect(html).toContain(f.q)
    }
  })
})

describe('AboutContent — カバレッジとエリア導線', () => {
  it('総店舗数・都道府県数を出力する', () => {
    const html = render()
    expect(html).toContain('760')
    expect(html).toContain('42')
  })

  it('人気エリアと全エリアハブへのリンクを持つ', () => {
    const html = render()
    expect(html).toContain('href="/area/tokyo"')
    expect(html).toContain('href="/area"')
  })
})

describe('AboutContent — サイト内リンク（フッター）', () => {
  it('地図トップ・設置店舗一覧・このサイトについて へのリンクを持つ', () => {
    const html = render()
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/area"')
    expect(html).toContain('href="/about"')
  })
})

describe('AboutContent — データ最終更新', () => {
  it('lastUpdated があれば「データ最終更新」を表示する', () => {
    expect(render('2026-06-28T00:00:00+09:00')).toContain('データ最終更新')
  })

  it('lastUpdated が無ければ更新日表示を省略する', () => {
    expect(render(null)).not.toContain('データ最終更新')
  })
})
