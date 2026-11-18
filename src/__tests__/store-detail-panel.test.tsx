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
    // 録画台/配信台以外の拡張属性（無制限台を含む）は埋めておき、「未登録」が録画台・配信台の2行に
    // 由来することを件数で特定する（formatByGameTernary が undefined を返す挙動の担保）
    const html = render(
      makeStore({
        businessHours: '10:00-23:00',
        floor: '2F',
        smoking: 'no',
        payments: ['Suica'],
        hasUnlimitedByGame: { 'gundam-exvs': 'no' },
        creditServiceByGame: { 'gundam-exvs': 'no' },
        rentalByGame: { 'gundam-exvs': 'no' },
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
        hasUnlimitedByGame: { 'gundam-exvs': 'no' },
        creditServiceByGame: { 'gundam-exvs': 'no' },
        rentalByGame: { 'gundam-exvs': 'no' },
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

describe('StoreDetailPanel — 無制限台', () => {
  it('配信台の下に無制限台の行を出し、「あり」には台数を添える', () => {
    const html = render(
      makeStore({
        hasStreamingByGame: { 'gundam-exvs': 'no' },
        hasUnlimitedByGame: { 'jojo-ls': 'no', 'gundam-exvs': 'yes' },
        unlimitedCountByGame: { 'gundam-exvs': 4 },
        attributeSources: { hasUnlimitedByGame: 'user-report' },
      }),
    )
    expect(html).toContain('無制限台')
    expect(html).toContain('ラスサバ なし（未確認） ／ イニブ あり・4台（未確認）')
    expect(html.indexOf('配信台')).toBeLessThan(html.indexOf('無制限台'))
  })

  it('片方だけの店はゲーム名なしで「あり・2台」', () => {
    const html = render(
      makeStore({
        games: ['gundam-exvs'],
        hasUnlimitedByGame: { 'gundam-exvs': 'yes' },
        unlimitedCountByGame: { 'gundam-exvs': 2 },
        attributeSources: { hasUnlimitedByGame: 'admin' },
      }),
    )
    expect(html).toContain('>あり・2台<')
  })
})

describe('StoreDetailPanel — 店のサービス', () => {
  it('設備一覧の下に別枠で出し、値が無ければ「未登録」', () => {
    const html = render(makeStore())
    expect(html).toContain('店のサービス')
    expect(html).toContain('クレジットサービス')
    expect(html).toContain('貸切')
    expect(html.indexOf('無制限台')).toBeLessThan(html.indexOf('店のサービス'))
    expect(html.indexOf('店のサービス')).toBeLessThan(html.indexOf('クレジットサービス'))
  })

  it('両ゲーム店は行の下にゲーム名つきの内容を1行ずつ出す', () => {
    const html = render(
      makeStore({
        creditServiceByGame: { 'jojo-ls': 'yes', 'gundam-exvs': 'yes' },
        creditServiceNoteByGame: { 'jojo-ls': '100円3クレ', 'gundam-exvs': '100円2クレ' },
        attributeSources: { creditServiceByGame: 'user-report' },
      }),
    )
    expect(html).toContain('ラスサバ あり（未確認） ／ イニブ あり（未確認）')
    expect(html).toContain('<span class="text-gray-500">ラスサバ </span>100円3クレ')
    expect(html).toContain('<span class="text-gray-500">イニブ </span>100円2クレ')
    // 内容は確定/未確認の対象外
    expect(html).not.toContain('100円2クレ（未確認）')
  })

  it('片方だけの店は内容にゲーム名を付けない', () => {
    const html = render(
      makeStore({
        games: ['gundam-exvs'],
        rentalByGame: { 'gundam-exvs': 'yes' },
        rentalNoteByGame: { 'gundam-exvs': '1時間3,000円から' },
      }),
    )
    expect(html).toContain('>あり（未確認）<')
    expect(html).toContain('>1時間3,000円から<')
    expect(html).not.toContain('イニブ </span>')
  })
})
