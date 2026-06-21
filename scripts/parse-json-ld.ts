/**
 * JSON-LD 抽出・属性正規化の本番モジュール。
 * PoC (scripts/poc/jsonld-probe.ts) から純関数を昇格させたもの。
 * CLI ランナーは含まない。
 */

import { parse } from 'node-html-parser'

/** schema.org の店舗系ノード（必要フィールドのみ） */
export interface BusinessNode {
  '@type'?: string | string[]
  name?: string
  url?: string
  address?: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
  }
  geo?: { latitude?: number | string; longitude?: number | string }
  openingHoursSpecification?: Array<{
    dayOfWeek?: string | string[]
    opens?: string
    closes?: string
  }>
}

const BUSINESS_TYPES = new Set([
  'LocalBusiness',
  'EntertainmentBusiness',
  'Store',
  'Place',
])

/** HTML 内の `<script type="application/ld+json">` を全てパースして配列で返す（壊れた塊は無視） */
export function extractJsonLd(html: string): unknown[] {
  const root = parse(html)
  const out: unknown[] = []
  for (const el of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(el.text.trim())
      if (Array.isArray(parsed)) out.push(...parsed)
      else out.push(parsed)
    } catch {
      // 壊れた塊はスキップ
    }
  }
  return out
}

/** JSON-LD ノード群から店舗本体（LocalBusiness 等）を1件選ぶ。無ければ null */
export function findBusinessNode(nodes: unknown[]): BusinessNode | null {
  for (const n of nodes) {
    if (!n || typeof n !== 'object') continue
    const types = ([] as string[]).concat((n as BusinessNode)['@type'] ?? [])
    if (types.some((t) => BUSINESS_TYPES.has(t))) return n as BusinessNode
  }
  return null
}

/** "10:00:00" / "10:00" → "10:00"。空文字・不正は null */
function normalizeClock(raw: string | undefined, isClose: boolean): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  let hh = Number.parseInt(m[1], 10)
  const mm = m[2]
  if (isClose && hh === 0 && mm === '00') hh = 24
  return `${String(hh).padStart(2, '0')}:${mm}`
}

/**
 * openingHoursSpecification を表示用の単一文字列へ正規化する。
 * 空文字エントリ（タイトーに混入するダミー）は除外。
 * 全曜日同一レンジなら "HH:MM-HH:MM"、割れる場合は最初の有効レンジを採用し variance を立てる。
 */
export function normalizeOpeningHours(
  specs: BusinessNode['openingHoursSpecification'],
): { hours: string | null; variance: boolean } {
  if (!specs?.length) return { hours: null, variance: false }
  const ranges = new Set<string>()
  for (const s of specs) {
    const opens = normalizeClock(s.opens, false)
    const closes = normalizeClock(s.closes, true)
    if (!opens || !closes) continue
    ranges.add(`${opens}-${closes}`)
  }
  if (ranges.size === 0) return { hours: null, variance: false }
  const [first] = ranges
  return { hours: first, variance: ranges.size > 1 }
}

/** geo（JSON-LD）から数値の lat/lng を取り出す。欠損/不正は null */
export function extractGeo(
  node: BusinessNode | null,
): { lat: number; lng: number } | null {
  const g = node?.geo
  if (!g) return null
  const lat = typeof g.latitude === 'string' ? Number.parseFloat(g.latitude) : g.latitude
  const lng = typeof g.longitude === 'string' ? Number.parseFloat(g.longitude) : g.longitude
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return null
  }
  return { lat, lng }
}

/** Google マップ埋め込み（`maps/embed/v1/place?...&q=LAT,LNG`）から座標を取り出す */
export function extractGeoFromMapEmbed(html: string): { lat: number; lng: number } | null {
  const m = html.match(/maps\/embed\/v1\/place[^"']*?[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (!m) return null
  return { lat: Number.parseFloat(m[1]), lng: Number.parseFloat(m[2]) }
}

/** streetAddress 末尾の「… N F」「…NF」「…N階」からフロアを抽出する（ヒューリスティック） */
export function extractFloorFromStreet(street: string | undefined): string | null {
  if (!street) return null
  const m = street.match(/(\d+)\s*(?:F|Ｆ|階)\s*$/)
  return m ? `${m[1]}F` : null
}
