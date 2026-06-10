import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import type { MergedStore } from './types'

/**
 * ジオコーディング段（Req2.3）。
 *
 * マージ済み店舗の住所を座標へ変換する。再問い合わせを避けるため
 * `scripts/cache/geocode.json`（正規化住所 → 座標）の永続キャッシュを優先し、
 * 未ヒットの住所のみ外部ジオコーディング（Google Geocoding REST）へ問い合わせる。
 *
 * - キャッシュヒット時はAPIを呼ばない（Req2.3）。
 * - 未ヒットの結果はキャッシュへ追記し、コミット対象に含める（呼び出し側が `saveCache`）。
 * - 既に座標を持つ店舗（前回値の引き継ぎ＝移設店舗など）はそのまま維持する。
 * - 個別住所のジオコード失敗時は当該店舗をスキップしログ記録、全体は継続する（Req2.3）。
 * - APIキーは地図表示用と分離した環境変数 `GOOGLE_GEOCODING_API_KEY` から読み込む。
 */

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

/**
 * ジオコード精度（Google Geocoding の `geometry.location_type`）。
 * - `ROOFTOP`: 建物までピンポイント特定（最良）
 * - `RANGE_INTERPOLATED`: 番地レンジからの内挿（良）
 * - `GEOMETRIC_CENTER`: 道路・区画の中心（可）
 * - `APPROXIMATE`: エリア重心へのフォールバック（要注意。字＋地番住所など）
 */
export type GeocodePrecision =
  | 'ROOFTOP'
  | 'RANGE_INTERPOLATED'
  | 'GEOMETRIC_CENTER'
  | 'APPROXIMATE'

/** 緯度経度（＋ジオコード精度のメタ情報） */
export interface GeocodeResult {
  lat: number
  lng: number
  /** Google の `location_type`（旧キャッシュには無いため任意） */
  precision?: GeocodePrecision
  /** 住所を最後まで照合できず推測した（Google の `partial_match`） */
  partialMatch?: boolean
}

/** 永続キャッシュ: 正規化住所 → 座標（＋精度メタ） */
export type GeocodeCache = Record<string, GeocodeResult>

/** 座標が確定したマージ済み店舗（ジオコーダ出力・生成器へ渡る） */
export type GeocodedStore = MergedStore & {
  lat: number
  lng: number
  precision?: GeocodePrecision
  partialMatch?: boolean
}

/**
 * ピン位置を「おおよそ（要確認）」とみなすか。
 * `location_type=APPROXIMATE`（建物まで特定できずエリア重心へフォールバック）のみを該当とする。
 *
 * `partial_match`（住所のビル名・階層まで照合できなかった）は**含めない**。ビル名付き住所では
 * 座標が `ROOFTOP`（建物精度）でも `partial_match=true` が頻発し、ピンは正確なのに誤検知に
 * なるため。`partial_match` は監査レポートに参考情報として残すのみ。
 */
export function isApproximateLocation(result: {
  precision?: GeocodePrecision
  partialMatch?: boolean
}): boolean {
  return result.precision === 'APPROXIMATE'
}

const VALID_PRECISIONS: ReadonlySet<string> = new Set<GeocodePrecision>([
  'ROOFTOP',
  'RANGE_INTERPOLATED',
  'GEOMETRIC_CENTER',
  'APPROXIMATE',
])

/** ジオコーダの出力 */
export interface GeocodeOutcome {
  /** 座標が確定した店舗（スキップ分は含まない） */
  stores: GeocodedStore[]
  /** 追記後のキャッシュ（commit 対象として書き戻す） */
  cache: GeocodeCache
  /** 今回新規にAPI問い合わせして成功した件数 */
  geocodedCount: number
  /** ジオコード失敗でスキップした店舗ID */
  skipped: string[]
}

// ---------------------------------------------------------------------------
// Google Geocoding REST（純粋部分・テスト可能）
// ---------------------------------------------------------------------------

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json'

/** 住所とAPIキーからジオコーディングのリクエストURLを組み立てる（日本語・地域バイアス付き） */
export function buildGeocodeUrl(address: string, apiKey: string): string {
  const search = new URLSearchParams({
    address,
    key: apiKey,
    language: 'ja',
    region: 'jp',
  })
  return `${GEOCODE_ENDPOINT}?${search.toString()}`
}

/**
 * 座標が日本の領域内にあるかを判定する（境界は離島を含む余裕を持たせた緩い矩形）。
 * 与那国島（東経約122.9）〜南鳥島（東経約154）、沖ノ鳥島（北緯約20.4）〜宗谷岬（北緯約45.5）。
 * (0,0) や国外センロイドなど明らかに誤ったジオコード結果を弾き、永続キャッシュ汚染を防ぐ。
 */
export function isValidJapanCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 20 &&
    lat <= 46 &&
    lng >= 122 &&
    lng <= 154
  )
}

/**
 * Google Geocoding APIのレスポンスから先頭結果の座標＋精度を取り出す（無ければ null）。
 * `geometry.location_type` を {@link GeocodePrecision} に、`partial_match` を `partialMatch`
 * に写し取る（後段の精度フラグ付け・監査で使う）。
 */
export function parseGeocodeResponse(body: unknown): GeocodeResult | null {
  const b = body as {
    status?: string
    results?: Array<{
      partial_match?: boolean
      geometry?: { location?: { lat?: number; lng?: number }; location_type?: string }
    }>
  }
  if (b?.status !== 'OK') return null
  const top = b.results?.[0]
  const loc = top?.geometry?.location
  if (loc == null || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null
  // 日本国外・(0,0) 等の不正座標は「結果なし」として扱い、キャッシュにも残さない
  if (!isValidJapanCoord(loc.lat, loc.lng)) return null
  const result: GeocodeResult = { lat: loc.lat, lng: loc.lng }
  const lt = top?.geometry?.location_type
  if (typeof lt === 'string' && VALID_PRECISIONS.has(lt)) result.precision = lt as GeocodePrecision
  if (top?.partial_match === true) result.partialMatch = true
  return result
}

/**
 * 既定のジオコード関数。Google Geocoding REST を1住所問い合わせる。
 * 結果なし（ZERO_RESULTS 等）は null、HTTPエラーは例外。
 */
async function defaultGeocodeFn(address: string, apiKey: string): Promise<GeocodeResult | null> {
  const res = await fetch(buildGeocodeUrl(address, apiKey))
  if (!res.ok) throw new Error(`HTTP ${res.status} for geocode`)
  return parseGeocodeResponse(await res.json())
}

// ---------------------------------------------------------------------------
// オーケストレーション
// ---------------------------------------------------------------------------

const DEFAULT_DELAY_MS = 100

/** 過度な負荷を避けるための待機（既定: setTimeout） */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface GeocoderDeps {
  /** 参照/追記するキャッシュ（既定: 空。呼び出し側が `loadCache` で読み込む） */
  cache?: GeocodeCache
  /** 1住所のジオコード関数（テスト時はモック注入）。結果なしは null、失敗は例外 */
  geocodeFn?: (address: string, apiKey: string) => Promise<GeocodeResult | null>
  /** APIキー（既定: 環境変数 `GOOGLE_GEOCODING_API_KEY`） */
  apiKey?: string
  /** API呼び出し間の待機関数（テスト時はモック注入） */
  sleep?: (ms: number) => Promise<void>
  /** API呼び出し間隔（ミリ秒） */
  delayMs?: number
  /** ログ出力（既定: console.warn） */
  log?: (msg: string) => void
}

/**
 * マージ済み店舗群を座標付きへ変換する（キャッシュ優先・Req2.3）。
 *
 * 処理順:
 * 1. 既に座標を持つ店舗（前回値引き継ぎ）はそのまま採用。
 * 2. `cache[normalizedAddress]` がヒットすれば座標を採用（API未呼び出し）。
 * 3. 未ヒットのみ `geocodeFn(address, apiKey)` を呼び、成功時はキャッシュへ追記。
 *    同一正規化住所の重複問い合わせは行わない。
 * 4. 失敗（null/例外）は当該店舗をスキップしログ記録、全体は継続。
 */
export async function geocodeStores(
  stores: MergedStore[],
  deps: GeocoderDeps = {},
): Promise<GeocodeOutcome> {
  const cache: GeocodeCache = deps.cache ?? {}
  const geocodeFn = deps.geocodeFn ?? defaultGeocodeFn
  const apiKey = deps.apiKey ?? process.env.GOOGLE_GEOCODING_API_KEY
  const sleep = deps.sleep ?? defaultSleep
  const delayMs = deps.delayMs ?? DEFAULT_DELAY_MS
  const log = deps.log ?? ((msg: string) => console.warn(msg))

  const out: GeocodedStore[] = []
  const skipped: string[] = []
  let geocodedCount = 0
  let apiCalls = 0

  for (const store of stores) {
    // 1. 前回値の引き継ぎ（移設店舗など）は座標をそのまま維持する。
    //    ただし精度メタ（precision/partialMatch）はキャッシュから補完する。これを怠ると
    //    generate 段で approximateLocation を再現できず、再生成のたびに「おおよその位置」
    //    フラグが全店から剥がれてしまう（キャッシュには精度が残っているのに失われる）。
    if (typeof store.lat === 'number' && typeof store.lng === 'number') {
      const meta = cache[store.normalizedAddress]
      out.push({
        ...store,
        lat: store.lat,
        lng: store.lng,
        precision: meta?.precision,
        partialMatch: meta?.partialMatch,
      })
      continue
    }

    const key = store.normalizedAddress

    // 2. キャッシュヒット
    const cached = cache[key]
    if (cached) {
      out.push({
        ...store,
        lat: cached.lat,
        lng: cached.lng,
        precision: cached.precision,
        partialMatch: cached.partialMatch,
      })
      continue
    }

    // 3. 未ヒット → API問い合わせ（APIキー必須）
    if (!apiKey) {
      throw new Error(
        'GOOGLE_GEOCODING_API_KEY が未設定です（ジオコードが必要な未キャッシュ住所があります）',
      )
    }

    // 過負荷回避: 2回目以降のAPI呼び出し前に間隔を空ける
    if (apiCalls > 0) await sleep(delayMs)
    apiCalls++

    let coords: GeocodeResult | null = null
    try {
      coords = await geocodeFn(store.address, apiKey)
    } catch (err) {
      log(`[geocode] failed (error): ${store.id} ${store.address} — ${String(err)}`)
      skipped.push(store.id)
      continue
    }

    if (!coords) {
      log(`[geocode] failed (no result): ${store.id} ${store.address}`)
      skipped.push(store.id)
      continue
    }

    cache[key] = coords
    geocodedCount++
    out.push({
      ...store,
      lat: coords.lat,
      lng: coords.lng,
      precision: coords.precision,
      partialMatch: coords.partialMatch,
    })
  }

  return { stores: out, cache, geocodedCount, skipped }
}

// ---------------------------------------------------------------------------
// キャッシュ永続化（ファイルIO）
// ---------------------------------------------------------------------------

/** キャッシュの既定パス（リポジトリ内に永続化し commit する） */
export const DEFAULT_CACHE_PATH = 'scripts/cache/geocode.json'

/** キャッシュをファイルから読み込む（無ければ空） */
export function loadCache(path: string = DEFAULT_CACHE_PATH): GeocodeCache {
  if (!existsSync(path)) return {}
  return JSON.parse(readFileSync(path, 'utf-8')) as GeocodeCache
}

/** キャッシュをファイルへ書き出す（キー順に整列して差分を安定させる） */
export function saveCache(cache: GeocodeCache, path: string = DEFAULT_CACHE_PATH): void {
  mkdirSync(dirname(path), { recursive: true })
  const sorted: GeocodeCache = {}
  for (const key of Object.keys(cache).sort()) sorted[key] = cache[key]
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8')
}
