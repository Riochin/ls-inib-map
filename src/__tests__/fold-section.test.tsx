import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FoldSection } from '@/components/FoldSection'
import { summarizePayments, summarizeServices } from '@/lib/form-summary'

describe('FoldSection', () => {
  it('初期は閉じ、見出しが本文を aria-controls で指す', () => {
    const html = renderToStaticMarkup(
      <FoldSection title="決済・電子マネー" summary="">
        <p>本文</p>
      </FoldSection>,
    )
    const button = html.match(/<button[^>]*>/)?.[0] ?? ''
    expect(button).toContain('aria-expanded="false"')
    const controls = button.match(/aria-controls="([^"]+)"/)?.[1]
    expect(controls).toBeTruthy()
    expect(html).toMatch(new RegExp(`<div id="${controls}" hidden=""`))
    expect(html).toContain('<p>本文</p>')
  })

  it('要約が空なら「未入力」、あれば要約とバッジを見出しに出す', () => {
    expect(
      renderToStaticMarkup(
        <FoldSection title="店のサービス" summary="">
          x
        </FoldSection>,
      ),
    ).toContain('>未入力<')
    const html = renderToStaticMarkup(
      <FoldSection title="店のサービス" summary="クレジットサービス あり（イニブ）" badge={<span>登録済み</span>}>
        x
      </FoldSection>,
    )
    expect(html).toContain('クレジットサービス あり（イニブ）')
    expect(html).toContain('登録済み')
    expect(html).not.toContain('未入力')
  })
})

describe('summarizePayments', () => {
  it('件数を出し、未選択は空', () => {
    expect(summarizePayments(['PayPay', 'iD', 'WAON'])).toBe('3件選択')
    expect(summarizePayments([])).toBe('')
  })
})

describe('summarizeServices', () => {
  const BOTH = ['jojo-ls', 'gundam-exvs'] as const
  it('一部のゲームだけ「あり」ならゲーム名を添える', () => {
    expect(
      summarizeServices(BOTH, [
        { label: 'クレジットサービス', values: { 'gundam-exvs': 'yes' } },
        { label: '貸切', values: {} },
      ]),
    ).toBe('クレジットサービス あり（イニブ）')
  })

  it('全ゲーム「あり」は「あり」、全部「なし」は「なし」、それ以外は「不明」を「・」でつなぐ', () => {
    expect(
      summarizeServices(BOTH, [
        { label: 'クレジットサービス', values: { 'jojo-ls': 'yes', 'gundam-exvs': 'yes' } },
        { label: '貸切', values: { 'jojo-ls': 'no', 'gundam-exvs': 'no' } },
      ]),
    ).toBe('クレジットサービス あり・貸切 なし')
    expect(
      summarizeServices(BOTH, [{ label: '貸切', values: { 'jojo-ls': 'no', 'gundam-exvs': 'unknown' } }]),
    ).toBe('貸切 不明')
  })

  it('片方だけの店で「あり」はゲーム名なし。未入力（空文字）は数えない', () => {
    expect(
      summarizeServices(['gundam-exvs'], [{ label: '貸切', values: { 'gundam-exvs': 'yes' } }]),
    ).toBe('貸切 あり')
    expect(summarizeServices(BOTH, [{ label: '貸切', values: { 'jojo-ls': '' } }])).toBe('')
  })
})
