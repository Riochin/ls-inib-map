/**
 * データ更新パイプライン（`scripts/`）専有の型定義。
 * ランタイム（`src/`）からは参照しない。生成物の契約型は `src/types/stores-file.ts` を参照。
 */

/** スクレイプ対象サイト識別子（公式2サイト） */
export type SiteKey = 'jojols' | 'gundam'

/**
 * スクレイパが公式一覧HTMLから抽出した未加工の店舗1件。
 * 住所はこの段階では正規化しない（正規化・マージは `merge.ts` の責務）。
 */
export interface RawStore {
  /** 抽出元サイト */
  site: SiteKey
  /** サイト内で安定する店舗ID（`detail?loc_id=...`）。クロスサイトの統合キーには使わない */
  locId: string
  /** 店舗名（表示用・建物名等を含む生テキスト） */
  name: string
  /** 店舗住所（生テキスト） */
  address: string
  /** 設置台数 */
  machineCount: number
  /** 取得元の地域コード（JP-01〜JP-47） */
  area: string
}

/**
 * スクレイパの出力。後段（merger）は `scrapedAreas` に含まれる地域でのみ
 * 移設判定（`delisted`）を適用し、取得失敗地域の店舗は前回状態を維持する。
 */
export interface ScrapeResult {
  /** 取得に成功した地域の店舗一覧（両サイト混在・未マージ） */
  stores: RawStore[]
  /** 今回正常取得できた地域コードの集合 */
  scrapedAreas: Set<string>
}
