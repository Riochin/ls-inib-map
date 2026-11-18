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

describe('StoreInfoForm — 店のサービス', () => {
  it('クレジットサービス・貸切を出し、「あり」でなければ内容欄は出さない', () => {
    const html = renderToStaticMarkup(<StoreInfoForm store={store} onClose={noop} />)
    expect(html).toContain('店のサービス')
    expect(html).toContain('クレジットサービス')
    expect(html).toContain('貸切')
    expect(html).not.toContain('クレサ')
    expect(html).not.toContain('の内容（')
  })

  it('両ゲーム店は ラスサバ、内容、イニブ、内容 の順に縦に並べる（内容は「あり」のゲームだけ）', () => {
    const html = renderToStaticMarkup(
      <StoreInfoForm
        store={{
          ...store,
          games: ['jojo-ls', 'gundam-exvs'],
          creditServiceByGame: { 'jojo-ls': 'yes', 'gundam-exvs': 'yes' },
          creditServiceNoteByGame: { 'jojo-ls': '100円3クレ', 'gundam-exvs': '100円2クレ' },
          rentalByGame: { 'gundam-exvs': 'no' },
        }}
        onClose={noop}
      />,
    )
    const jojoNote = html.indexOf('aria-label="クレジットサービスの内容（ラスサバ）"')
    const gundamNote = html.indexOf('aria-label="クレジットサービスの内容（イニブ）"')
    expect(jojoNote).toBeGreaterThan(-1)
    expect(gundamNote).toBeGreaterThan(jojoNote)
    expect(html).toContain('value="100円3クレ"')
    expect(html).not.toContain('貸切の内容（')
  })
})

describe('StoreInfoForm — 折りたたみ', () => {
  const both: Store = { ...store, games: ['jojo-ls', 'gundam-exvs'] }

  it('決済・電子マネーと店のサービスは初期は閉じ、無制限台より後ろに並ぶ', () => {
    const html = renderToStaticMarkup(<StoreInfoForm store={both} onClose={noop} />)
    const buttons = html.match(/<button type="button"[^>]*aria-expanded="[^"]*"[^>]*>/g) ?? []
    expect(buttons).toHaveLength(2)
    for (const b of buttons) expect(b).toContain('aria-expanded="false"')
    expect(html.indexOf('無制限台')).toBeLessThan(html.indexOf('決済・電子マネー'))
    expect(html.indexOf('決済・電子マネー')).toBeLessThan(html.indexOf('店のサービス'))
    expect(html.indexOf('店のサービス')).toBeLessThan(html.indexOf('修正・通報'))
    expect((html.match(/>未入力</g) ?? []).length).toBe(2)
  })

  it('たたんだ見出しに要約と登録済みを出す', () => {
    const html = renderToStaticMarkup(
      <StoreInfoForm
        store={{
          ...both,
          payments: ['PayPay', 'iD', 'WAON'],
          creditServiceByGame: { 'gundam-exvs': 'yes' },
        }}
        onClose={noop}
      />,
    )
    expect(html).toContain('3件選択')
    expect(html).toContain('クレジットサービス あり（イニブ）')
    const header = (title: string) => {
      const start = html.lastIndexOf('<button', html.indexOf(`>${title}<`))
      return html.slice(start, html.indexOf('</button>', start))
    }
    expect(header('決済・電子マネー')).toContain('登録済み')
    expect(header('店のサービス')).toContain('登録済み')
  })
})
