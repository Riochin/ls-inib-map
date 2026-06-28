import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AreaHubContent } from '@/components/area/AreaHubContent'
import type { AreaSummary } from '@/lib/area'

/**
 * エリア一覧ハブ `/area` の本文（presentational）を検証する。
 * 単一 <h1>・概況・各県エリアページへのリンク集（店舗数併記）を担保する。
 */

const areas: AreaSummary[] = [
  { prefecture: '大阪府', slug: 'osaka', total: 3, countByGame: { 'gundam-exvs': 2, 'jojo-ls': 1 } },
  { prefecture: '東京都', slug: 'tokyo', total: 2, countByGame: { 'gundam-exvs': 2, 'jojo-ls': 1 } },
]

function render(list: AreaSummary[] = areas): string {
  return renderToStaticMarkup(<AreaHubContent areas={list} />)
}

describe('AreaHubContent — 見出しと概況', () => {
  it('単一の <h1> を出力する', () => {
    const html = render()
    expect((html.match(/<h1/g) ?? []).length).toBe(1)
  })

  it('サイト全体の概況に総店舗数（5店）を示す', () => {
    expect(render()).toContain('5店')
  })

  it('概況に都道府県数（2都道府県）を示す', () => {
    expect(render()).toContain('2都道府県')
  })
})

describe('AreaHubContent — リンク集', () => {
  it('各都道府県エリアページへのリンクを出力する', () => {
    const html = render()
    expect(html).toContain('href="/area/osaka"')
    expect(html).toContain('href="/area/tokyo"')
  })

  it('各リンクに設置店舗数を併記する', () => {
    const html = render()
    expect(html).toContain('大阪府（3店）')
    expect(html).toContain('東京都（2店）')
  })
})
