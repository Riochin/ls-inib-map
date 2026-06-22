/** ゲームタイトル識別子 */
export type GameTitle = 'jojo-ls' | 'gundam-exvs'

/**
 * 台数情報の出どころ（provenance）。
 * - `official`: 公式公表値（既定。`countSources` にキーが無い状態と同義）
 * - `auto-scrape`: 自動取得（未確認・将来のチェーン店設備抽出用に予約）
 * - `user-report`: ユーザー報告（未確認）
 * - `admin`: 管理者が確認済み
 */
export type Provenance = 'official' | 'auto-scrape' | 'user-report' | 'admin'

/** 三値状態（あり / なし / 不明） */
export type TernaryState = 'yes' | 'no' | 'unknown'

/** 店舗属性キー（attributeSources で provenance を管理する対象） */
export type StoreAttributeKey =
  | 'businessHours'
  | 'floor'
  | 'smoking'
  | 'payments'
  | 'hasRecordingByGame'
  | 'hasStreamingByGame'
  | 'officialUrl'

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
  /**
   * ゲーム別台数の出どころ（任意）。手動オーバーライドで `machineCounts` を
   * 上書きしたゲームにのみ記録する。キー無し＝公式公表値（`official`）。
   * 表示側はこれを見てユーザー報告/未確認の見た目を変える。
   */
  countSources?: Partial<Record<GameTitle, Provenance>>
  /** 閉店フラグ（恒久閉店・手動判定・🌸表示。省略時は営業中） */
  closed?: boolean
  /**
   * 移設可能性フラグ（公式一覧から消失＝移設/撤去の可能性・自動検出・無装飾グレー）。
   * `closed`（閉店）とは別状態。両者が重なる場合は `closed` を優先表示する。
   */
  delisted?: boolean
  /**
   * ピン位置がおおよそであることを示すフラグ（任意）。住所のジオコード精度が
   * 低い（Google の `location_type=APPROXIMATE` または `partial_match`）場合に
   * 生成器が付与する。「字＋地番」住所などで建物まで特定できずエリア重心へ
   * フォールバックした店舗が該当。省略時はピン位置が概ね確からしい。
   * 表示側はこれを見て「おおよその位置」注記を出す。
   */
  approximateLocation?: boolean
  /**
   * この店舗情報を運営が最後に更新した日時（ISO 8601・任意）。手動オーバーライドの
   * `updatedAt` を runtime で写したもの。override が無い店では未設定。表示側は店舗単位の
   * 「情報更新: 日付」として使う（地図全体のスクレイプ最終更新日とは別物）。
   */
  infoUpdatedAt?: string
  /** 営業時間（例: "10:00-23:00"・任意） */
  businessHours?: string
  /** フロア（例: "2F"・任意） */
  floor?: string
  /** 喫煙所の有無（任意） */
  smoking?: TernaryState
  /** 決済手段リスト（例: ["Suica", "PayPay"]・任意） */
  payments?: string[]
  /**
   * ゲーム別 録画台の有無（任意。`machineCounts` と同じ持ち方）。配信台/録画台は
   * タイトルごとの筐体に紐づく設備のため、店舗単位ではなくタイトル別に保持する
   * （例 `{ 'jojo-ls': 'no', 'gundam-exvs': 'yes' }`）。
   */
  hasRecordingByGame?: Partial<Record<GameTitle, TernaryState>>
  /** ゲーム別 配信台の有無（任意。{@link Store.hasRecordingByGame} と同パターン） */
  hasStreamingByGame?: Partial<Record<GameTitle, TernaryState>>
  /** 公式店舗ページURL（例: "https://location.taito.co.jp/locs/stores/1234/"・任意） */
  officialUrl?: string
  /**
   * 属性別の出どころ（任意）。`countSources` と同一 `Partial<Record<...>>` パターン。
   * キー無し＝provenance 不明（未登録）。`applyOverrides` でのみ書き込まれる。
   */
  attributeSources?: Partial<Record<StoreAttributeKey, Provenance>>
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
