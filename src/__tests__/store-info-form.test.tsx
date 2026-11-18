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

describe('StoreInfoForm — 無制限台', () => {
  it('配信台の下に無制限台の欄がある（説明文なし）', () => {
    const html = renderToStaticMarkup(<StoreInfoForm store={store} onClose={noop} />)
    expect(html).toContain('無制限台')
    expect(html.indexOf('配信台')).toBeLessThan(html.indexOf('無制限台'))
    // 「あり」でなければ台数欄は出さない
    expect(html).not.toContain('台数（わかれば）')
  })

  it('登録済みで「あり」のゲームは台数欄を既存値つきで出す', () => {
    const html = renderToStaticMarkup(
      <StoreInfoForm
        store={{
          ...store,
          games: ['jojo-ls', 'gundam-exvs'],
          hasUnlimitedByGame: { 'jojo-ls': 'no', 'gundam-exvs': 'yes' },
          unlimitedCountByGame: { 'gundam-exvs': 4 },
        }}
        onClose={noop}
      />,
    )
    expect((html.match(/台数（わかれば）/g) ?? []).length).toBe(1)
    expect(html).toContain('aria-label="無制限台の台数（イニブ）"')
    expect(html).toMatch(/value="4"/)
  })
})
