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
  /** 閉店フラグ（省略時は営業中） */
  closed?: boolean
}

/** フィルタ選択肢 */
export type FilterOption = 'all' | GameTitle
