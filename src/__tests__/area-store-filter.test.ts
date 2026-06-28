import { describe, it, expect } from 'vitest'
import { filterAreaStoresByGame } from '@/lib/area-store-filter'
import { EMPTY_FACILITY_FILTER } from '@/types/store'
import type { GameTitle, Store } from '@/types/store'

function makeStore(
  partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'address' | 'games'>,
): Store {
  return { lat: 0, lng: 0, ...partial }
}

const shinjuku = makeStore({
  id: 'tk-a',
  name: 'Aゲーセン新宿',
  address: '東京都新宿区新宿3-1-1',
  games: ['gundam-exvs', 'jojo-ls'],
  machineCounts: { 'gundam-exvs': 12, 'jojo-ls': 4 },
  hasStreamingByGame: { 'gundam-exvs': 'yes' },
  smoking: 'yes',
})
const akihabara = makeStore({
  id: 'tk-b',
  name: 'Bモール秋葉原',
  address: '東京都千代田区外神田1-1-1',
  games: ['gundam-exvs'],
  machineCounts: { 'gundam-exvs': 4 },
})

const storesByGame: Record<GameTitle, Store[]> = {
  'gundam-exvs': [shinjuku, akihabara],
  'jojo-ls': [shinjuku],
}

const NO_FILTER = { query: '', facility: EMPTY_FACILITY_FILTER }

describe('filterAreaStoresByGame — フリーテキスト', () => {
  it('検索語が空なら各タイトルの全店をそのまま返す', () => {
    const result = filterAreaStoresByGame(storesByGame, NO_FILTER)
    expect(result['gundam-exvs']).toHaveLength(2)
    expect(result['jojo-ls']).toHaveLength(1)
  })

  it('店名で絞り込む', () => {
    const result = filterAreaStoresByGame(storesByGame, { ...NO_FILTER, query: '秋葉原' })
    expect(result['gundam-exvs'].map((s) => s.id)).toEqual(['tk-b'])
    expect(result['jojo-ls']).toHaveLength(0)
  })

  it('住所でも絞り込める（エリア語入力が実質的な所在地絞り込みを兼ねる）', () => {
    const result = filterAreaStoresByGame(storesByGame, { ...NO_FILTER, query: '新宿' })
    expect(result['gundam-exvs'].map((s) => s.id)).toEqual(['tk-a'])
    expect(result['jojo-ls'].map((s) => s.id)).toEqual(['tk-a'])
  })

  it('空白区切りは AND（全トークン一致のみ通過）', () => {
    expect(
      filterAreaStoresByGame(storesByGame, { ...NO_FILTER, query: '新宿 秋葉原' })['gundam-exvs'],
    ).toHaveLength(0)
  })
})

describe('filterAreaStoresByGame — 設備ファセット（当該タイトルでスコープ）', () => {
  it('最低台数は当該タイトルの台数でスコープする', () => {
    const result = filterAreaStoresByGame(storesByGame, {
      query: '',
      facility: { ...EMPTY_FACILITY_FILTER, minMachines: 8 },
    })
    // gundam: 新宿12台のみ通過（秋葉原4台は落ちる）
    expect(result['gundam-exvs'].map((s) => s.id)).toEqual(['tk-a'])
    // jojo: 新宿は jojo 4台なので 8台以上で落ちる
    expect(result['jojo-ls']).toHaveLength(0)
  })

  it('配信台ありは当該タイトルの配信台でスコープする', () => {
    const result = filterAreaStoresByGame(storesByGame, {
      query: '',
      facility: { ...EMPTY_FACILITY_FILTER, hasStreaming: true },
    })
    // gundam は 新宿が yes
    expect(result['gundam-exvs'].map((s) => s.id)).toEqual(['tk-a'])
    // jojo は配信台情報なし → 0件
    expect(result['jojo-ls']).toHaveLength(0)
  })

  it('喫煙所ありは店舗単位で絞る', () => {
    const result = filterAreaStoresByGame(storesByGame, {
      query: '',
      facility: { ...EMPTY_FACILITY_FILTER, hasSmoking: true },
    })
    expect(result['gundam-exvs'].map((s) => s.id)).toEqual(['tk-a'])
  })

  it('フリーテキストと設備は AND 結合する', () => {
    const result = filterAreaStoresByGame(storesByGame, {
      query: '秋葉原',
      facility: { ...EMPTY_FACILITY_FILTER, hasSmoking: true },
    })
    // 秋葉原は喫煙所なし → 0件
    expect(result['gundam-exvs']).toHaveLength(0)
  })
})
