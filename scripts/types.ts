/**
 * データ更新パイプライン（`scripts/`）専有の型定義。
 * ランタイム（`src/`）からは参照しない。生成物の契約型は `src/types/stores-file.ts` を参照。
 */

import type { GameTitle } from '@/types/store'

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

/**
 * マージ済みの店舗（`merge.ts` の出力・ジオコード前）。
 *
 * 正規化住所キーで両サイトを統合し `games` を合成・決定論的IDを採番した状態。
 * 最終的な {@link Store} へは `lat`/`lng` をジオコーダが補完し、
 * `normalizedAddress`/`area` を生成器が落とす。移設店舗（`delisted`）など
 * 前回値を引き継ぐ場合は `lat`/`lng` を保持する。
 */
export interface MergedStore {
  /** 正規化住所＋店舗名から導出した決定論的ID */
  id: string
  /** 表示用店舗名（建物名等を含む生テキスト） */
  name: string
  /** 表示用住所（建物名等を含む生テキスト） */
  address: string
  /** マージキー兼ジオコードキャッシュキー（建物名を除く番地レベルまで） */
  normalizedAddress: string
  /** 稼働タイトル（合成済み・1つ以上） */
  games: [GameTitle, ...GameTitle[]]
  /**
   * ゲーム別の設置台数（任意）。両サイトの `RawStore.machineCount` を
   * タイトル別に集約したもの。表記の無い（0）タイトルは省略する。
   */
  machineCounts?: Partial<Record<GameTitle, number>>
  /** 取得元/導出された地域コード（JP-01〜JP-47） */
  area: string
  /** 手動の閉店フラグ（前回値を維持。本パイプラインでは変更しない） */
  closed?: boolean
  /** 移設可能性フラグ（公式一覧から消失・自動検出） */
  delisted?: boolean
  /** 緯度（前回値の引き継ぎ時のみ設定。未設定はジオコーダが補完） */
  lat?: number
  /** 経度（前回値の引き継ぎ時のみ設定。未設定はジオコーダが補完） */
  lng?: number
}
