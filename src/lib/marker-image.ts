import { getThemeByKey, type ThemeKey } from '@/lib/marker-color'

/**
 * マーカー画像のテーマキー。色分けテーマ（marker-color）と一対一で対応する。
 * 二重定義を避けるため `ThemeKey` を再利用する。
 */
export type MarkerThemeKey = ThemeKey

/**
 * マーカー画像（`<img>`）へ当てる薄い影。クラスタバブルの box-shadow と質感を揃える。
 * SVG filter ではなく CSS drop-shadow を使うことで、高DPI端末でもピンをぼかさず
 * 鮮明なまま影だけ重ねる（drop-shadow はアルファ形状＝ピン輪郭に沿う）。
 */
export const MARKER_SHADOW_FILTER = 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.3))'

export interface MarkerImage {
  /** data:image/svg+xml,... 形式のピン画像 */
  url: string
  width: number
  height: number
  /**
   * 画像下辺からアンカー点（ピン先端）までの距離(px)。
   * AdvancedMarkerElement は「コンテンツ下辺中央」を座標に合わせるため、
   * 先端を下辺から浮かせたぶん、表示時にこの値だけ下へずらして補正する。
   */
  anchorBottomOffset: number
}

/** ピン本体（先端まで）のサイズ。白枠・影ぶんの余白は別途 PIN_PADDING で確保する */
const PIN_CORE_WIDTH = 28
const PIN_CORE_HEIGHT = 36
/**
 * 白枠・影が外側へはみ出すぶんの余白。先端の枠・影が見切れないよう全周に足す。
 * 下にも足したぶんピン先端が下辺から浮くが、表示側で anchorBottomOffset だけ
 * 下へずらして補正するので、刺さる座標はズレない。
 */
const PIN_PADDING = 4
/** 余白込みのピン画像サイズ（img 要素のレンダリングサイズ） */
const PIN_WIDTH = PIN_CORE_WIDTH + PIN_PADDING * 2
const PIN_HEIGHT = PIN_CORE_HEIGHT + PIN_PADDING * 2
/** 閉店マーカー（🌸のみ）のサイズ。旧 StoreMarker の絵文字表示に揃える */
const CLOSED_SIZE = 40

/**
 * ピン型 SVG 文字列を生成する純関数（both/gundamOnly/delisted）。
 * グラデ塗り＋中央の白丸に、クラスタバブルと揃えた白枠（stroke）を重ねて
 * 地図背景に溶けないよう視認性を上げる。グラデは各 SVG 内に閉じた `<defs>` と
 * して埋め込み、自己完結させる（DOM 非依存・SSR 安全）。
 *
 * 薄い影は SVG の `<filter>` ではなく、表示側の `<img>` に CSS の drop-shadow
 * （MARKER_SHADOW_FILTER）で付ける。SVG filter を `<img>` 内に入れると高DPI端末で
 * SVG 実寸でラスタライズされてピンがぼやけるため、影だけ CSS 側に逃がしている。
 */
function buildPinSvg(theme: MarkerThemeKey): string {
  const { gradientFrom, gradientTo } = getThemeByKey(theme)
  const gradId = `grad-${theme}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">` +
    `<defs>` +
    `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${gradientFrom}"/>` +
    `<stop offset="100%" stop-color="${gradientTo}"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<g transform="translate(${PIN_PADDING} ${PIN_PADDING})">` +
    `<path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z" fill="url(#${gradId})" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>` +
    `<circle cx="14" cy="14" r="5" fill="white"/>` +
    `</g>` +
    `</svg>`
  )
}

/**
 * 閉店マーカーの SVG。ピン型ではなく🌸の絵文字のみ（旧 StoreMarker と同じ見た目）。
 */
function buildClosedSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CLOSED_SIZE}" height="${CLOSED_SIZE}" viewBox="0 0 ${CLOSED_SIZE} ${CLOSED_SIZE}">` +
    `<text x="20" y="21" font-size="34" text-anchor="middle" dominant-baseline="central">🌸</text>` +
    `</svg>`
  )
}

function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function toMarkerImage(theme: MarkerThemeKey): MarkerImage {
  if (theme === 'closed') {
    // 🌸は全体が下辺中央アンカーでよい（先端の概念がない）ため補正なし
    return { url: dataUri(buildClosedSvg()), width: CLOSED_SIZE, height: CLOSED_SIZE, anchorBottomOffset: 0 }
  }
  return { url: dataUri(buildPinSvg(theme)), width: PIN_WIDTH, height: PIN_HEIGHT, anchorBottomOffset: PIN_PADDING }
}

/**
 * テーマごとに一度だけ生成したマーカー画像のキャッシュ。
 * モジュール読込時に4テーマ分を生成し、以後は同一参照を返す（再生成なし）。
 */
const MARKER_IMAGES: Record<MarkerThemeKey, MarkerImage> = {
  both: toMarkerImage('both'),
  gundamOnly: toMarkerImage('gundamOnly'),
  closed: toMarkerImage('closed'),
  delisted: toMarkerImage('delisted'),
}

/** テーマ別のマーカー画像を取得する。同一テーマには同一参照を返す。 */
export function getMarkerImage(theme: MarkerThemeKey): MarkerImage {
  return MARKER_IMAGES[theme]
}
