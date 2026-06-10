import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Store } from '@/types/store'
import type { StoresFile, StoresMeta } from '@/types/stores-file'
import { isApproximateLocation, type GeocodedStore } from './geocode'

/**
 * JSON生成器と差分ゲート（Req2.4, 2.7, 5.1）。
 *
 * 座標付き店舗・最終更新日時・出典・任意の公式総数から生成物 `stores.json`
 * （{@link StoresFile}）を生成する。
 *
 * - 生成時刻を `lastUpdated` として埋め込む（Req5.1）。決定論性のため時刻は呼び出し側が注入する。
 * - 必須フィールド（座標が数値・タイトル非空）を生成器側で保証する（不正は例外で中断）。
 * - 出力店舗は id 昇順に整列し、再生成時の差分を安定させる。
 * - 現行JSONと生成JSONを `lastUpdated` を除外して正規化比較し、実体差分が無ければ
 *   書き込み・コミットしない（Req2.7）。
 */

// ---------------------------------------------------------------------------
// 必須フィールド検証（Req2.4）
// ---------------------------------------------------------------------------

/** 座標が数値・タイトル非空・id/name/address 非空であることを保証する（不正は例外） */
function assertValidStore(g: GeocodedStore): void {
  if (
    typeof g.lat !== 'number' ||
    !Number.isFinite(g.lat) ||
    typeof g.lng !== 'number' ||
    !Number.isFinite(g.lng)
  ) {
    throw new Error(`[generate] 座標が数値でありません: ${g.id} ${g.address}`)
  }
  if (!Array.isArray(g.games) || g.games.length === 0) {
    throw new Error(`[generate] タイトルが空です: ${g.id} ${g.address}`)
  }
  if (!g.id || !g.name || !g.address) {
    throw new Error(`[generate] 必須フィールドが欠落しています: ${g.id}`)
  }
}

/** 座標付きマージ済み店舗をランタイム用 {@link Store} へ変換（パイプライン専有フィールドを落とす） */
function toStore(g: GeocodedStore): Store {
  const store: Store = {
    id: g.id,
    name: g.name,
    address: g.address,
    lat: g.lat,
    lng: g.lng,
    games: g.games,
  }
  // ゲーム別台数は非空時のみ保持（マージ段で GAME_ORDER 順に構築済み）
  if (g.machineCounts && Object.keys(g.machineCounts).length > 0) {
    store.machineCounts = g.machineCounts
  }
  // 閉店（手動）/移設（自動）は設定時のみ保持（省略時は営業中）
  if (g.closed) store.closed = true
  if (g.delisted) store.delisted = true
  // ジオコード精度が低い（エリア重心フォールバック等）店舗にだけ「おおよその位置」フラグを付与
  if (isApproximateLocation(g)) store.approximateLocation = true
  return store
}

// ---------------------------------------------------------------------------
// 生成（Req5.1）
// ---------------------------------------------------------------------------

export interface GenerateInput {
  /** 座標が確定した店舗（ジオコーダ出力） */
  stores: GeocodedStore[]
  /** データ出典URL（公式2サイト） */
  source: StoresMeta['source']
  /** 最終更新日時として埋め込む生成時刻（ISO 8601・呼び出し側が注入） */
  now: string
}

/**
 * 座標付き店舗とメタ情報から生成物 {@link StoresFile} を組み立てる（Req2.4, 5.1）。
 * 必須フィールドを検証し、店舗を id 昇順に整列して決定論的な出力を返す。
 */
export function generateStoresFile(input: GenerateInput): StoresFile {
  const stores = input.stores.map((g) => {
    assertValidStore(g)
    return toStore(g)
  })
  stores.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const file: StoresFile = {
    lastUpdated: input.now,
    source: input.source,
    stores,
  }
  return file
}

// ---------------------------------------------------------------------------
// 差分ゲート（Req2.7）
// ---------------------------------------------------------------------------

/** オブジェクトのキーを再帰的にソートして正規化（キー順の違いを差分とみなさない） */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) sorted[key] = canonicalize(obj[key])
    return sorted
  }
  return value
}

/** 比較対象から `lastUpdated` を除外する */
function stripLastUpdated(file: StoresFile): Omit<StoresFile, 'lastUpdated'> {
  const { lastUpdated: _lastUpdated, ...rest } = file
  return rest
}

/**
 * 現行JSONと生成JSONを `lastUpdated` を除外して正規化比較し、実体差分があれば true（Req2.7）。
 * 現行が存在しない（初回生成）場合は常に差分ありとみなす。
 */
export function hasMeaningfulDiff(current: StoresFile | null, next: StoresFile): boolean {
  if (!current) return true
  return (
    JSON.stringify(canonicalize(stripLastUpdated(current))) !==
    JSON.stringify(canonicalize(stripLastUpdated(next)))
  )
}

// ---------------------------------------------------------------------------
// ファイルIO（差分ゲート付き書き込み）
// ---------------------------------------------------------------------------

/** 生成物 `stores.json` の既定パス（ビルド時バンドル → CDNエッジ配信） */
export const DEFAULT_STORES_PATH = 'src/data/stores.json'

/** 現行 `stores.json` を読み込む（無ければ null） */
export function loadStoresFile(path: string = DEFAULT_STORES_PATH): StoresFile | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as StoresFile
}

/**
 * 差分ゲート付き書き込み（Req2.7）。
 * 現行と実体差分が無ければ書き込まず false を返す（コミットを発生させない）。
 * 差分があれば `stores.json` を書き、true を返す。
 */
export function writeStoresFileIfChanged(
  next: StoresFile,
  path: string = DEFAULT_STORES_PATH,
): boolean {
  const current = loadStoresFile(path)
  if (!hasMeaningfulDiff(current, next)) return false
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
  return true
}
