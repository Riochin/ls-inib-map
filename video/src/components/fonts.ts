import { loadFont as loadRounded } from '@remotion/google-fonts/MPLUSRounded1c'
import { loadFont as loadNoto } from '@remotion/google-fonts/NotoSansJP'

/**
 * フォント（LP と同じ組み合わせ）。見出しは M PLUS Rounded 1c、本文は Noto Sans JP。
 * `@remotion/google-fonts` はレンダリング時にフォント読込を待ってくれる。
 */
const rounded = loadRounded('normal', { weights: ['500', '700'], subsets: ['japanese', 'latin'] })
const noto = loadNoto('normal', { weights: ['400', '500', '700'], subsets: ['japanese', 'latin'] })

export const HEADING_FONT = rounded.fontFamily
export const BODY_FONT = noto.fontFamily
