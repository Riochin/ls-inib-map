import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StoreDetailPanel } from '@/components/StoreDetailPanel'
import type { Store } from '@/types/store'

/**
 * StoreDetailPanel の表示挙動を SSR レンダリング（renderToStaticMarkup）で検証する。
 * jsdom / Testing Library を導入せず、出力 HTML の文字列で挙動を担保する軽量方式。
 * 主眼は「録画台/配信台のタイトル別表示」と「ByGame 未設定時の『未登録』表示」。
 */

const noop = () => {}

function makeStore(extra: Partial<Store> = {}): Store {
  return {
    id: 's1',
    name: 'テスト店',
    address: '東京都新宿区1-1-1',
    lat: 35.6895,
    lng: 139.6917,
    games: ['jojo-ls', 'gundam-exvs'],
    ...extra,
  }
}

function render(store: Store): string {
  return renderToStaticMarkup(
    <StoreDetailPanel store={store} onOpenInfoForm={noop} onClose={noop} />,
  )
}

describe('StoreDetailPanel — 録画台/配信台のタイトル別表示', () => {
  it('ByGame が未設定なら録画台・配信台ともに「未登録」と表示する', () => {
    // 録画台/配信台以外の拡張属性は埋めておき、「未登録」が録画台・配信台の2行に
    // 由来することを件数で特定する（formatByGameTernary が undefined を返す挙動の担保）
    const html = render(
      makeStore({
        businessHours: '10:00-23:00',
        floor: '2F',
        smoking: 'no',
        payments: ['Suica'],
      }),
    )
    const count = (html.match(/未登録/g) ?? []).length
    expect(count).toBe(2)
  })

  it('複数タイトル店ではタイトル別に値を併記する（確定＝admin出どころは未確認なし）', () => {
    // 他属性も埋め、ByGame を入れた録画台/配信台が「未登録」にならないことを担保する。
    // 出どころ admin で確定にし、（未確認）が付かない素の併記文字列を検証する。
    const html = render(
      makeStore({
        businessHours: '10:00-23:00',
        floor: '2F',
        smoking: 'no',
        payments: ['Suica'],
        hasRecordingByGame: { 'jojo-ls': 'unknown', 'gundam-exvs': 'yes' },
        hasStreamingByGame: { 'jojo-ls': 'no', 'gundam-exvs': 'no' },
        attributeSources: { hasRecordingByGame: 'admin', hasStreamingByGame: 'admin' },
      }),
    )
    expect(html).toContain('ラスサバ 不明 ／ イニブ あり')
    expect(html).toContain('ラスサバ なし ／ イニブ なし')
    expect(html).not.toContain('未登録')
  })

  it('単一タイトル店ではタイトル名を省略して値のみ表示する', () => {
    const html = render(
      makeStore({
        games: ['gundam-exvs'],
        hasRecordingByGame: { 'gundam-exvs': 'yes' },
        attributeSources: { hasRecordingByGame: 'admin' },
      }),
    )
    // 録画台の行は「あり」のみ（「イニブ あり」ではない）
    expect(html).toContain('>あり<')
  })

  it('admin 以外の出どころの yes/no には（未確認）を付け、unknown には付けない', () => {
    const html = render(
      makeStore({
        hasRecordingByGame: { 'jojo-ls': 'unknown', 'gundam-exvs': 'yes' },
        attributeSources: { hasRecordingByGame: 'user-report' },
      }),
    )
    expect(html).toContain('イニブ あり（未確認）')
    expect(html).not.toContain('不明（未確認）')
  })
})

describe('StoreDetailPanel — フロアのゲーム別表示', () => {
  it('floorByGame が別フロアでも admin 出どころなら未確認を付けずタイトル別に併記する', () => {
    const html = render(
      makeStore({
        floorByGame: { 'jojo-ls': '2F', 'gundam-exvs': '3F' },
        attributeSources: { floor: 'admin' },
      }),
    )
    expect(html).toContain('ラスサバ 2F ／ イニブ 3F')
    expect(html).not.toContain('2F（未確認）')
  })

  it('共通フロアが admin 出どころなら確定として1つに集約表示する', () => {
    const html = render(
      makeStore({
        floorByGame: { 'jojo-ls': '2F', 'gundam-exvs': '2F' },
        attributeSources: { floor: 'admin' },
      }),
    )
    expect(html).toContain('>2F<')
    expect(html).not.toContain('未確認')
    expect(html).not.toContain('ラスサバ 2F')
  })

  it('店舗共通フロアのみで出どころ未登録なら共通フロアを未確認表示する（集約）', () => {
    const html = render(makeStore({ floor: '2F' }))
    expect(html).toContain('>2F（未確認）<')
    expect(html).not.toContain('ラスサバ 2F')
  })

  it('単一タイトル店も出どころで判定する（admin は値のみ）', () => {
    const html = render(
      makeStore({ games: ['gundam-exvs'], floor: '2F', attributeSources: { floor: 'admin' } }),
    )
    expect(html).toContain('>2F<')
    expect(html).not.toContain('2F（未確認）')
  })
})
