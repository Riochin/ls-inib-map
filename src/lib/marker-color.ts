import type { Store } from '@/types/store'
import type { FilterOption, Provenance } from '@/types/store'

export interface ColorTheme {
  gradientFrom: string
  gradientTo: string
  badgeBg: string
  badgeText: string
  /** 未確認バッジ用の薄い背景色（文字色は badgeBg＝メインカラーを使う） */
  badgeSoftBg: string
  filterActiveBg: string
  filterActiveText: string
}

const THEMES = {
  both: {
    gradientFrom: '#7B2FBE',
    gradientTo: '#C4A0E8',
    badgeBg: '#7B2FBE',
    badgeText: '#FFFFFF',
    badgeSoftBg: '#F3E8FF',
    filterActiveBg: 'bg-purple-700',
    filterActiveText: 'text-white',
  },
  gundamOnly: {
    gradientFrom: '#2563EB',
    gradientTo: '#DBEAFE',
    badgeBg: '#2563EB',
    badgeText: '#FFFFFF',
    badgeSoftBg: '#DBEAFE',
    filterActiveBg: 'bg-blue-600',
    filterActiveText: 'text-white',
  },
  closed: {
    gradientFrom: '#4B5563',
    gradientTo: '#9CA3AF',
    badgeBg: '#4B5563',
    badgeText: '#FFFFFF',
    badgeSoftBg: '#E5E7EB',
    filterActiveBg: 'bg-gray-400',
    filterActiveText: 'text-white',
  },
  // 移設可能性（公式一覧から消失・自動検出）。閉店と同じグレー系だが、絵文字なしの無装飾ピン。
  delisted: {
    gradientFrom: '#4B5563',
    gradientTo: '#9CA3AF',
    badgeBg: '#4B5563',
    badgeText: '#FFFFFF',
    badgeSoftBg: '#E5E7EB',
    filterActiveBg: 'bg-gray-400',
    filterActiveText: 'text-white',
  },
} as const satisfies Record<string, ColorTheme>

export function getMarkerTheme(store: Store): ColorTheme {
  return getThemeByKey(getThemeKey(store))
}

export type ThemeKey = 'both' | 'gundamOnly' | 'closed' | 'delisted'

// 表示優先: closed（🌸）> delisted（移設？・グレー）> ゲーム別色
export function getThemeKey(store: Store): ThemeKey {
  if (store.closed) return 'closed'
  if (store.delisted) return 'delisted'
  const hasJojo = store.games.includes('jojo-ls')
  return hasJojo ? 'both' : 'gundamOnly'
}

export function getThemeByKey(key: ThemeKey): ColorTheme {
  return THEMES[key]
}

/** 店舗の状態ラベル（閉店 / 移設？）。通常店舗は null。 */
export function getStoreStatusLabel(store: Store): string | null {
  if (store.closed) return '閉店'
  if (store.delisted) return '移設？'
  return null
}

/** マーカー上に重畳する絵文字。閉店は🌸、移設・通常は絵文字なし（null）。 */
export function getMarkerEmoji(store: Store): string | null {
  if (store.closed) return '🌸'
  return null
}

export function getMarkerColor(store: Store): string {
  return getMarkerTheme(store).gradientFrom
}

export function getFilterActiveColor(filter: FilterOption): { bg: string; text: string } {
  switch (filter) {
    case 'jojo-ls':
      return { bg: THEMES.both.filterActiveBg, text: THEMES.both.filterActiveText }
    case 'gundam-exvs':
      return { bg: THEMES.gundamOnly.filterActiveBg, text: THEMES.gundamOnly.filterActiveText }
    default:
      return { bg: 'bg-gray-900', text: 'text-white' }
  }
}

export function getGameLabel(game: 'jojo-ls' | 'gundam-exvs'): string {
  return game === 'jojo-ls' ? 'ラスサバ' : 'イニブ'
}

/**
 * 台数の出どころ（provenance）を、平易な日本語の説明と「確からしさ」で表す。
 * 別ラベルは出さず、台数バッジ自体の色の濃淡で確からしさを示し、
 * タップ時にこの説明（label）を見せる方針（ノンテック層配慮・アイコン不使用）。
 */
export interface CountSourceInfo {
  /** タップ時に出す、出どころの平易な説明 */
  label: string
  /**
   * 運営が現地確認した「確定」の台数か。`admin` のみ true。
   * 公式値はライブモニター込みで不正確なことがあるため確定扱いにせず、
   * false（＝バッジを薄く表示）とする。確定UIは運営確認のみ。
   */
  confirmed: boolean
}

/**
 * フィールド（台数・属性）の出どころが運営確認済み（確定）かを返す。
 * `admin`（運営が現地確認）のみ確定。公式・自動取得・みんなの報告・未登録（undefined）は未確認。
 * 台数バッジと属性行で共通の確定判定として使う（モデル統一）。
 */
export function isConfirmedSource(source?: Provenance): boolean {
  return source === 'admin'
}

/**
 * 台数の出どころに応じた説明と確からしさを返す。
 * `admin`（運営確認）だけを確定とし、それ以外（公式・みんなの報告・自動取得）は未確認。
 */
export function getCountSourceInfo(source?: Provenance): CountSourceInfo {
  switch (source) {
    case 'admin':
      return { label: '運営が確認した台数', confirmed: true }
    case 'user-report':
      return { label: 'みんなの報告（未確認）', confirmed: false }
    case 'auto-scrape':
      return { label: '自動取得（未確認）', confirmed: false }
    case 'official':
    default:
      return { label: '公式サイトの台数（未確認・ライブモニター含む場合あり）', confirmed: false }
  }
}

/**
 * 台数バッジの配色を確からしさで出し分ける。
 * - 確定（運営確認）: メインカラー背景 ＋ 白文字
 * - 未確認: 薄いメインカラー背景 ＋ メインカラー文字（白文字だと眠くなるため）
 */
export function getCountBadgeStyle(
  theme: ColorTheme,
  confirmed: boolean,
): { backgroundColor: string; color: string } {
  return confirmed
    ? { backgroundColor: theme.badgeBg, color: theme.badgeText }
    : { backgroundColor: theme.badgeSoftBg, color: theme.badgeBg }
}
