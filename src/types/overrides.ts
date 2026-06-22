import type { GameTitle, Provenance, TernaryState } from './store'

/**
 * 1店舗ぶんの手動オーバーライド。公式スクレイプ由来の店舗データに重ねる。
 * 公式サイトに無い/誤っている情報（ライブモニター込みの台数など）を、
 * 毎週のスクレイプに消されずに保持するための層。
 */
export interface OverrideEntry {
  /** この修正の出どころ（user-report / admin / auto-scrape など） */
  source: Provenance
  /** 人間用メモ（店名・報告元など。IDが変わって効かなくなった時の手がかり） */
  note?: string
  /**
   * このオーバーライドを最後に更新した日時（ISO 8601・任意）。
   * 管理GUIの保存時に内容が変わったエントリへ自動で打たれる。表示では店舗単位の
   * 「情報更新日」として使う（地図全体のスクレイプ最終更新日とは別物）。
   */
  updatedAt?: string
  /** ゲーム別台数の上書き（指定したゲームのみ置換する） */
  machineCounts?: Partial<Record<GameTitle, number>>
  closed?: boolean
  delisted?: boolean
  name?: string
  address?: string
  lat?: number
  lng?: number
  /** 営業時間（任意） */
  businessHours?: string
  /** フロア（任意） */
  floor?: string
  /** 喫煙所の有無（任意） */
  smoking?: TernaryState
  /** 決済手段リスト（任意） */
  payments?: string[]
  /** ゲーム別 録画台の有無（任意。指定したゲームのみ置換する） */
  hasRecordingByGame?: Partial<Record<GameTitle, TernaryState>>
  /** ゲーム別 配信台の有無（任意。指定したゲームのみ置換する） */
  hasStreamingByGame?: Partial<Record<GameTitle, TernaryState>>
  /** 公式店舗ページURL（任意） */
  officialUrl?: string
}

/** `src/data/overrides.json` のスキーマ。店舗IDをキーに {@link OverrideEntry} を持つ。 */
export interface OverridesFile {
  overrides: Record<string, OverrideEntry>
}
