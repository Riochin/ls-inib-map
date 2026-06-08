/** ゲームタイトル識別子 */
export type GameTitle = 'jojo-ls' | 'gundam-exvs'

/** 設置店舗 */
export interface Store {
  /** 一意な店舗ID */
  id: string
  /** 店舗名 */
  name: string
  /** 店舗住所 */
  address: string
  /** 緯度 */
  lat: number
  /** 経度 */
  lng: number
  /** 稼働タイトル（1つ以上） */
  games: [GameTitle, ...GameTitle[]]
  /**
   * ゲーム別の設置台数（公式公表値・任意）。各サイトが個別に公表するため
   * タイトルごとに保持する（例 `{ 'jojo-ls': 3, 'gundam-exvs': 2 }`）。
   * 公式表記が無い（0）タイトルはキーごと省略する。
   */
  machineCounts?: Partial<Record<GameTitle, number>>
  /** 閉店フラグ（恒久閉店・手動判定・🌸表示。省略時は営業中） */
  closed?: boolean
  /**
   * 移設可能性フラグ（公式一覧から消失＝移設/撤去の可能性・自動検出・無装飾グレー）。
   * `closed`（閉店）とは別状態。両者が重なる場合は `closed` を優先表示する。
   */
  delisted?: boolean
}

/** フィルタ選択肢 */
export type FilterOption = 'all' | GameTitle

/** 住所パース結果 */
export interface ParsedAddress {
  prefecture: string
  city: string | null
  ward: string | null
}

/** 住所フィルタ選択状態 */
export interface AddressFilter {
  prefecture: string | null
  cities: string[]
  wards: string[]
}

/** 住所インデックス */
export interface AddressIndex {
  prefectureCities: Map<string, string[]>
  cityWards: Map<string, string[]>
  storeAddresses: Map<string, ParsedAddress>
}

export const EMPTY_ADDRESS_FILTER: AddressFilter = {
  prefecture: null,
  cities: [],
  wards: [],
}
