import type { GameTitle, Provenance } from './store'

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
  /** ゲーム別台数の上書き（指定したゲームのみ置換する） */
  machineCounts?: Partial<Record<GameTitle, number>>
  closed?: boolean
  delisted?: boolean
  name?: string
  address?: string
  lat?: number
  lng?: number
}

/** `src/data/overrides.json` のスキーマ。店舗IDをキーに {@link OverrideEntry} を持つ。 */
export interface OverridesFile {
  overrides: Record<string, OverrideEntry>
}
