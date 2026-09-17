import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SeoContent } from '@/components/SeoContent'
import { getAreaPrefectures } from '@/lib/area'
import { stores } from '@/data/stores'

/**
 * トップページの SEO 本文（SeoContent）を検証する。
 * - 文書構造のための単一 <h1>
 * - 全都道府県のエリアページと /about への内部リンク（クロール経路の強化）
 * - 隠し全店リスト（店名・台数）は可視のエリアページへ移管済みで、ここには出さない
 * 地図 UI の見た目に影響させないため sr-only での非表示は維持する。
 */

function render(): string {
  return renderToStaticMarkup(<SeoContent />)
}

describe('SeoContent — 単一 <h1> の保持', () => {
  it('単一の <h1> を出力する', () => {
    const html = render()
    expect((html.match(/<h1/g) ?? []).length).toBe(1)
  })

  it('サイトを表す見出しテキストを <h1> に含める', () => {
    expect(render()).toContain('ラスサバ・イニブ 設置店舗マップ')
  })
})

describe('SeoContent — サイト内リンク', () => {
  it('エリア一覧 /area と /about へリンクする', () => {
    const html = render()
    expect(html).toContain('href="/area"')
    expect(html).toContain('href="/about"')
  })

  it('店舗のある全都道府県のエリアページへリンクする', () => {
    const html = render()
    const areas = getAreaPrefectures()
    expect(areas.length).toBeGreaterThan(0)
    for (const area of areas) {
      expect(html).toContain(`href="/area/${area.slug}"`)
    }
  })

  it('県リンクのアンカーテキストは都道府県名を含む', () => {
    const html = render()
    for (const area of getAreaPrefectures()) {
      expect(html).toContain(`${area.prefecture}の設置店舗`)
    }
  })

  it('県リンクは nav（ラベル付き）にまとめる', () => {
    expect(render()).toMatch(/<nav aria-label="[^"]+"/)
  })
})

describe('SeoContent — 隠し全店リストの撤去（本文相当の情報は出さない）', () => {
  it('店舗名を出力しない', () => {
    const html = render()
    for (const store of stores.slice(0, 20)) {
      expect(html).not.toContain(store.name)
    }
  })

  it('都道府県セクションの見出し（<h3>）を出力しない', () => {
    expect(render()).not.toContain('<h3')
  })

  it('リンク数は都道府県数＋固定リンク（/area・/about）に収まる', () => {
    const html = render()
    const links = (html.match(/<a /g) ?? []).length
    expect(links).toBe(getAreaPrefectures().length + 2)
  })
})

describe('SeoContent — 視覚的影響ゼロ', () => {
  it('sr-only で視覚的に隠したままにする', () => {
    expect(render()).toContain('sr-only')
  })
})
