import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SearchBar } from '@/components/SearchBar'
import type { Store } from '@/types/store'

const noop = () => {}

const stores: Store[] = [
  { id: 's1', name: '新宿店', address: '東京都新宿区1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
  { id: 's2', name: '渋谷店', address: '東京都渋谷区1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
]

function render(query: string, results: Store[]): string {
  return renderToStaticMarkup(
    <SearchBar query={query} onChange={noop} onSelect={noop} results={results} onClose={noop} />,
  )
}

describe('SearchBar — アクセシビリティ（結果件数のライブリージョン）', () => {
  it('未入力時はメッセージが空', () => {
    const html = render('', [])
    const live = html.match(/<p[^>]*role="status"[^>]*aria-live="polite"[^>]*>([^<]*)<\/p>/)
    expect(live?.[1] ?? '').toBe('')
  })

  it('該当あり: 実件数（表示上限に関わらず results.length）を読み上げる', () => {
    const html = render('新宿', stores)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('2件')
  })

  it('該当なし: 「該当する店舗がありません」を読み上げる', () => {
    const html = render('存在しない店舗名', [])
    expect(html).toContain('該当する店舗がありません')
  })
})
