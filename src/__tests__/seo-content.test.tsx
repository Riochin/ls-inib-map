import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SeoContent } from '@/components/SeoContent'

/**
 * トップページの SEO 本文（SeoContent）を検証する。
 * 隠し全店リスト（sr-only の都道府県別一覧）は可視のエリアページ（/area・/area/[pref]）へ
 * 移管したため撤去し、文書構造のための単一 <h1> のみを保持することを担保する。
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

describe('SeoContent — 隠し全店リストの撤去', () => {
  it('都道府県別の全店リスト見出しを出力しない', () => {
    expect(render()).not.toContain('都道府県別の設置店舗一覧')
  })

  it('店舗名の一覧（<li>）を出力しない', () => {
    expect(render()).not.toContain('<li')
  })

  it('都道府県セクションの見出し（<h3>）を出力しない', () => {
    expect(render()).not.toContain('<h3')
  })
})

describe('SeoContent — 視覚的影響ゼロ', () => {
  it('sr-only で視覚的に隠したままにする', () => {
    expect(render()).toContain('sr-only')
  })
})
