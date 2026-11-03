import { BRAND_PURPLE } from '@/lib/brand'

/** 色・寸法の単一ソース（LP と同じブランド紫）。 */
export const COLORS = {
  purple: BRAND_PURPLE,
  purpleSoft: '#F5F0FF',
  text: '#111827',
  muted: '#6B7280',
  bezel: '#111827',
  white: '#FFFFFF',
}

/** 撮影した画面の CSS ピクセル寸法（iPhone 相当）。 */
export const SCREEN = { width: 375, height: 812 }

/** クリップシーンでのスマホ画面の表示倍率と位置（1080×1920 の中）。 */
export const PHONE_SCALE = 1.75
export const PHONE_TOP = 330
export const BEZEL = 20
export const SCREEN_RADIUS = 44
