import { getThemeByKey, type ThemeKey } from '@/lib/marker-color'

/**
 * マーカー画像のテーマキー。色分けテーマ（marker-color）と一対一で対応する。
 * 二重定義を避けるため `ThemeKey` を再利用する。
 */
export type MarkerThemeKey = ThemeKey

export interface MarkerImage {
  /** data:image/svg+xml,... 形式のピン画像 */
  url: string
  width: number
  height: number
}

const PIN_WIDTH = 28
const PIN_HEIGHT = 36
/** 閉店マーカー（🌸のみ）のサイズ。旧 StoreMarker の絵文字表示に揃える */
const CLOSED_SIZE = 40

/**
 * ピン型 SVG 文字列を生成する純関数（both/gundamOnly/delisted）。
 * グラデ塗り＋中央の白丸。グラデは各 SVG 内に閉じた `<defs>` として埋め込み、
 * 自己完結させる（DOM 非依存・SSR 安全）。
 */
function buildPinSvg(theme: MarkerThemeKey): string {
  const { gradientFrom, gradientTo } = getThemeByKey(theme)
  const gradId = `grad-${theme}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">` +
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${gradientFrom}"/>` +
    `<stop offset="100%" stop-color="${gradientTo}"/>` +
    `</linearGradient></defs>` +
    `<path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z" fill="url(#${gradId})"/>` +
    `<circle cx="14" cy="14" r="5" fill="white"/>` +
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
    return { url: dataUri(buildClosedSvg()), width: CLOSED_SIZE, height: CLOSED_SIZE }
  }
  return { url: dataUri(buildPinSvg(theme)), width: PIN_WIDTH, height: PIN_HEIGHT }
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
