import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StoreInfoForm } from '@/components/StoreInfoForm'
import type { Store } from '@/types/store'

const noop = () => {}

const store: Store = {
  id: 's1',
  name: 'テスト店',
  address: '東京都新宿区1-1-1',
  lat: 35.6895,
  lng: 139.6917,
  games: ['jojo-ls'],
}

describe('StoreInfoForm — アクセシビリティ', () => {
  it('dialog として意味付けされ、見出しに紐づく', () => {
    const html = renderToStaticMarkup(<StoreInfoForm store={store} onClose={noop} />)
    const dialog = html.match(/<div[^>]*role="dialog"[^>]*>/)
    expect(dialog?.[0]).toContain('aria-modal="true"')
    expect(dialog?.[0]).toContain('aria-labelledby="store-info-form-title"')
    expect(html).toContain('id="store-info-form-title"')
  })
})
