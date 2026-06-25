import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AddressFilterModal } from '@/components/AddressFilterModal'
import { buildAddressIndex } from '@/lib/address-parser'
import { EMPTY_STORE_FILTER } from '@/types/store'
import type { Store, StoreFilter, FilterOption } from '@/types/store'

const stores: Store[] = [
  { id: 't1', name: '新宿', address: '東京都新宿区1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
  { id: 'o1', name: '大阪', address: '大阪府大阪市北区1-1', lat: 0, lng: 0, games: ['jojo-ls'] },
]
const index = buildAddressIndex(stores)

function render(
  filter: StoreFilter,
  opts: { previewCount?: (f: StoreFilter, g: FilterOption) => number; gameFilter?: FilterOption } = {},
): string {
  return renderToStaticMarkup(
    <AddressFilterModal
      index={index}
      filter={filter}
      gameFilter={opts.gameFilter ?? 'all'}
      onApply={() => {}}
      onGameFilterChange={() => {}}
      onClose={() => {}}
      previewCount={opts.previewCount}
    />,
  )
}

/** name 属性で該当する <input> タグ片を取り出す（属性順に依存しない）。 */
function inputByName(html: string, name: string): string {
  const m = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))
  return m ? m[0] : ''
}

describe('AddressFilterModal — アクセシビリティ', () => {
  it('シートが dialog として意味付けされ、見出しに紐づく', () => {
    const html = render(EMPTY_STORE_FILTER)
    const dialog = html.match(/<div[^>]*role="dialog"[^>]*>/)
    expect(dialog?.[0]).toContain('aria-modal="true"')
    expect(dialog?.[0]).toContain('aria-labelledby="filter-modal-title"')
    expect(html).toContain('id="filter-modal-title"')
  })

  it('適用中バーが group としてラベル付けされる', () => {
    const applied: StoreFilter = {
      ...EMPTY_STORE_FILTER,
      address: { ...EMPTY_STORE_FILTER.address, prefectures: ['東京都'] },
    }
    const html = render(applied)
    const group = html.match(/<div[^>]*role="group"[^>]*>/)
    expect(group?.[0]).toContain('aria-label="適用中の絞り込み条件"')
  })

  it('件数のライブリージョン（aria-live=polite）で結果件数を読み上げる', () => {
    const html = render(EMPTY_STORE_FILTER, { previewCount: () => 38 })
    const live = html.match(/<p[^>]*aria-live="polite"[^>]*>[^<]*<\/p>/)
    expect(live?.[0]).toContain('role="status"')
    expect(live?.[0]).toContain('38件')
  })
})

describe('AddressFilterModal — ゲームタイトル選択', () => {
  it('すべて/ラスサバ/イニブの3択を表示する', () => {
    const html = render(EMPTY_STORE_FILTER)
    expect(html).toContain('すべて')
    expect(html).toContain('ラスサバ')
    expect(html).toContain('イニブ')
  })

  it('gameFilter prop に応じて選択状態（aria-pressed）が反映される', () => {
    const html = render(EMPTY_STORE_FILTER, { gameFilter: 'jojo-ls' })
    const m = html.match(/<button[^>]*name="game-jojo-ls"[^>]*>/)
    expect(m?.[0]).toContain('aria-pressed="true"')
    const all = html.match(/<button[^>]*name="game-all"[^>]*>/)
    expect(all?.[0]).toContain('aria-pressed="false"')
  })
})

describe('AddressFilterModal — 最低台数チップ', () => {
  it('指定なし＋台数チップを表示する', () => {
    const html = render(EMPTY_STORE_FILTER)
    expect(html).toContain('指定なし')
    expect(html).toContain('3台〜')
  })

  it('選択中の台数チップが aria-pressed=true', () => {
    const html = render({
      ...EMPTY_STORE_FILTER,
      facility: { ...EMPTY_STORE_FILTER.facility, minMachines: 3 },
    })
    const m = html.match(/<button[^>]*name="min-3"[^>]*>/)
    expect(m?.[0]).toContain('aria-pressed="true"')
  })
})

describe('AddressFilterModal — 地方セクション', () => {
  it('見出し「地方」と主要な地方ラベルを表示する', () => {
    const html = render(EMPTY_STORE_FILTER)
    expect(html).toContain('地方')
    expect(html).toContain('関東')
    expect(html).toContain('近畿')
    expect(html).toContain('九州沖縄')
  })

  it('地方を選択すると都県リストがその地方のみに絞られる', () => {
    const html = render({ ...EMPTY_STORE_FILTER, address: { ...EMPTY_STORE_FILTER.address, region: '関東' } })
    expect(html).toContain('東京都')
    expect(html).not.toContain('大阪府')
  })

  it('都道府県は複数選択でき、選択中の県が checked', () => {
    const html = render({
      ...EMPTY_STORE_FILTER,
      address: { ...EMPTY_STORE_FILTER.address, prefectures: ['東京都', '大阪府'] },
    })
    // チェックボックス（複数選択）であること
    expect(inputByName(html, 'prefecture-東京都')).toContain('type="checkbox"')
    expect(inputByName(html, 'prefecture-東京都')).toContain('checked')
    expect(inputByName(html, 'prefecture-大阪府')).toContain('checked')
  })
})

describe('AddressFilterModal — 設備・条件セクション', () => {
  it('設備の各ラベルを表示する', () => {
    const html = render(EMPTY_STORE_FILTER)
    expect(html).toContain('最低台数')
    expect(html).toContain('配信台')
    expect(html).toContain('録画台')
    expect(html).toContain('喫煙所')
    expect(html).toContain('営業中')
  })

  it('facility.hasStreaming が true のとき配信台チェックが checked', () => {
    const html = render({
      ...EMPTY_STORE_FILTER,
      facility: { ...EMPTY_STORE_FILTER.facility, hasStreaming: true },
    })
    expect(inputByName(html, 'facility-hasStreaming')).toContain('checked')
    expect(inputByName(html, 'facility-hasRecording')).not.toContain('checked')
  })

  it('facility.openOnly が true のとき営業中チェックが checked', () => {
    const html = render({
      ...EMPTY_STORE_FILTER,
      facility: { ...EMPTY_STORE_FILTER.facility, openOnly: true },
    })
    expect(inputByName(html, 'facility-openOnly')).toContain('checked')
  })
})

describe('AddressFilterModal — 情報の充実度セクション', () => {
  it('3択ラベル（すべて/充実/不足）を表示する', () => {
    const html = render(EMPTY_STORE_FILTER)
    expect(html).toContain('情報')
    expect(html).toContain('充実')
    expect(html).toContain('不足')
  })

  it("completeness が 'rich' のとき該当ラジオが checked", () => {
    const html = render({ ...EMPTY_STORE_FILTER, completeness: 'rich' })
    const m = html.match(/<input[^>]*value="rich"[^>]*>/)
    expect(m?.[0]).toContain('checked')
  })
})

describe('AddressFilterModal — 適用中バー・件数・サマリー', () => {
  const applied: StoreFilter = {
    address: { region: '関東', prefectures: ['東京都'], cities: [], wards: [] },
    facility: { ...EMPTY_STORE_FILTER.facility, openOnly: true },
    completeness: 'all',
  }

  it('適用中の条件をチップとして表示し、外すボタンを持つ', () => {
    const html = render(applied)
    expect(html).toContain('関東')
    expect(html).toContain('東京都')
    expect(html).toContain('営業中')
    expect(html).toContain('外す')
  })

  it('previewCount を渡すと結果件数を表示する', () => {
    const html = render(applied, { previewCount: () => 38 })
    expect(html).toContain('38')
    expect(html).toContain('件')
  })

  it('アコーディオン各行に現在の選択サマリーを表示する', () => {
    const html = render(applied)
    // 設備セクションの見出しに「営業中」サマリーが出る
    expect(html).toContain('営業中')
  })
})
