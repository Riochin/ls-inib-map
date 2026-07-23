import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import NotFound from '@/app/not-found'

/**
 * 404ページの本文を検証する。単一 <h1> と、ホーム・エリア一覧・aboutへの導線を担保する。
 */

function render(): string {
  return renderToStaticMarkup(<NotFound />)
}

describe('NotFound — 構造', () => {
  it('単一の <h1> を出力する', () => {
    expect((render().match(/<h1/g) ?? []).length).toBe(1)
  })

  it('ホーム・エリア一覧・aboutへのリンクを出力する', () => {
    const html = render()
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/area"')
    expect(html).toContain('href="/about"')
  })
})
