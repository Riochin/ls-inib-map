import type { GameTitle, Provenance, StoreAttributeKey, TernaryState } from './store'

/**
 * 1店舗ぶんの手動オーバーライド。公式スクレイプ由来の店舗データに重ねる。
 * 公式サイトに無い/誤っている情報（ライブモニター込みの台数など）を、
 * 毎週のスクレイプに消されずに保持するための層。
 */
export interface OverrideEntry {
  /** この修正の既定の出どころ（user-report / admin / auto-scrape など）。フィールド個別指定が無いものに使う。 */
  source: Provenance
  /**
   * フィールド個別の出どころ（任意）。指定したフィールドは {@link OverrideEntry.source} より優先する。
   * 1エントリ内でフィールドごとに確信度が違うとき（例: フロアは現地確認=admin だが台数は user-report）に使う。
   * 値を適用するフィールドにのみ効く（このエントリで値を持たないフィールドへの source 単独指定は無視）。
   */
  attributeSources?: Partial<Record<StoreAttributeKey, Provenance>>
  /** ゲーム別台数の個別出どころ（任意。{@link OverrideEntry.attributeSources} の `machineCounts` 版） */
  countSources?: Partial<Record<GameTitle, Provenance>>
  /**
   * 内部メモ（非公開）。店名・報告元・Issue番号・運用判断など、トリアージ用の手がかり。
   * 地図には一切出さない。公開して良い補足は {@link OverrideEntry.remarks} に書く。
   */
  note?: string
  /**
   * 補足（公開・任意）。構造化フィールド（営業時間・台数など）に収まらない自由記述を、
   * 詳細モーダルの「補足」欄に運営編集テキストとして表示する。{@link OverrideEntry.note}
   * （非公開）とは別物。SNS ID・Issue番号など内部情報は書かない。確定/未確認の出どころ
   * 管理（attributeSources）の対象外＝運営が要約して書く編集物として中立表示する。
   */
  remarks?: string
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
  /** フロア（任意・店舗単位の共通フロア） */
  floor?: string
  /** ゲーム別フロア（任意。指定したゲームのみ置換する。例 `{ 'jojo-ls': '2F', 'gundam-exvs': '3F' }`） */
  floorByGame?: Partial<Record<GameTitle, string>>
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
