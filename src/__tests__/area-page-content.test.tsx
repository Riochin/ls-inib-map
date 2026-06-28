import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AreaPageContent } from '@/components/area/AreaPageContent'
import type { AreaDetail, AreaSummary } from '@/lib/area'
import type { Store } from '@/types/store'

function makeStore(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'address' | 'games'>): Store {
  return { lat: 0, lng: 0, ...partial }
}

const tokyoDetail: AreaDetail = {
  prefecture: '東京都',
  slug: 'tokyo',
  total: 2,
  storesByGame: {
    'gundam-exvs': [
      makeStore({ id: 'tk-a', name: 'Aゲーセン新宿', address: '東京都新宿区新宿3-1-1', games: ['gundam-exvs', 'jojo-ls'] }),
      makeStore({ id: 'tk-b', name: 'Bモール秋葉原', address: '東京都千代田区外神田1-1-1', games: ['gundam-exvs'] }),
    ],
    'jojo-ls': [
      makeStore({ id: 'tk-a', name: 'Aゲーセン新宿', address: '東京都新宿区新宿3-1-1', games: ['gundam-exvs', 'jojo-ls'] }),
    ],
  },
}

const gundamOnlyDetail: AreaDetail = {
  prefecture: '沖縄県',
  slug: 'okinawa',
  total: 1,
  storesByGame: {
    'gundam-exvs': [makeStore({ id: 'ok-1', name: '那覇店', address: '沖縄県那覇市1-1-1', games: ['gundam-exvs'] })],
    'jojo-ls': [],
  },
}

const source = { jojols: 'https://example.com/jojols', gundam: 'https://example.com/gundam' }
const otherAreas: AreaSummary[] = [
  { prefecture: '大阪府', slug: 'osaka', total: 3, countByGame: { 'gundam-exvs': 2, 'jojo-ls': 1 } },
  { prefecture: '東京都', slug: 'tokyo', total: 2, countByGame: { 'gundam-exvs': 2, 'jojo-ls': 1 } },
]

function render(detail: AreaDetail, opts: { lastUpdated?: string | null } = {}): string {
  // 「未指定」と「明示的に null」を区別する（null ?? default だと null が既定値に化けるため）。
  const lastUpdated = 'lastUpdated' in opts ? opts.lastUpdated : '2026-06-28T09:00:00.000Z'
  return renderToStaticMarkup(
    <AreaPageContent detail={detail} lastUpdated={lastUpdated} source={source} otherAreas={otherAreas} />,
  )
}

describe('AreaPageContent — 見出しとリード', () => {
  it('単一の <h1> に「○○県のラスサバ・イニブ 設置店舗一覧」を可視テキストで出力する', () => {
    const html = render(tokyoDetail)
    const h1Count = (html.match(/<h1/g) ?? []).length
    expect(h1Count).toBe(1)
    expect(html).toContain('東京都のラスサバ・イニブ 設置店舗一覧')
  })

  it('県内店舗数をリードに表示する', () => {
    const html = render(tokyoDetail)
    expect(html).toContain('2店')
  })

  it('データ最終更新日を表示する（欠落時は省略）', () => {
    expect(render(tokyoDetail)).toContain('更新')
    const withoutDate = render(tokyoDetail, { lastUpdated: null })
    expect(withoutDate).not.toContain('更新')
  })
})

describe('AreaPageContent — タイトル別セクション', () => {
  it('件数が1以上の各タイトルを <h2> セクションに分割する', () => {
    const html = render(tokyoDetail)
    expect(html).toContain('<h2')
    expect(html).toContain('東京都のイニブ')
    expect(html).toContain('東京都のラスサバ')
  })

  it('件数0のタイトルはセクションを出さない', () => {
    const html = render(gundamOnlyDetail)
    // 見出し（H1）には「ラスサバ・イニブ」が含まれるため、セクション見出し（「設置店」付き）で判定する
    expect(html).toContain('沖縄県のイニブ設置店')
    expect(html).not.toContain('沖縄県のラスサバ設置店')
  })
})

describe('AreaPageContent — ページ間回遊', () => {
  it('地図アプリ（/）への導線を表示する', () => {
    const html = render(tokyoDetail)
    expect(html).toContain('href="/"')
  })

  it('他の都道府県エリアページへの内部リンクを表示する（自県は除く）', () => {
    const html = render(tokyoDetail)
    expect(html).toContain('href="/area/osaka"')
    expect(html).not.toContain('href="/area/tokyo"')
  })

  it('パンくず（ホーム → 設置店舗 → ○○県）を可視テキストで表示する', () => {
    const html = render(tokyoDetail)
    expect(html).toContain('ホーム')
    expect(html).toContain('設置店舗')
    expect(html).toContain('href="/area"')
  })
})

describe('AreaPageContent — 構造化データ', () => {
  it('BreadcrumbList と ItemList の JSON-LD を出力する', () => {
    const html = render(tokyoDetail)
    expect(html).toContain('BreadcrumbList')
    expect(html).toContain('ItemList')
  })

  it('個別店舗を LocalBusiness としてマークアップしない', () => {
    const html = render(tokyoDetail)
    expect(html).not.toContain('LocalBusiness')
  })
})
