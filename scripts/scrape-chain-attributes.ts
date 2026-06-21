/**
 * チェーン店公式サイトから店舗属性（営業時間・公式URL・緯度経度）を自動取得し、
 * src/data/scrape-attributes.json を更新する月次バッチスクリプト（ver2.3.3）。
 *
 * 対象: タイトーステーション（53店） / namco（27店）
 * provenance: 'auto-scrape'（未確認）
 * 実行: pnpm exec tsx scripts/scrape-chain-attributes.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as url from 'node:url'
import { normalizeAddress } from './merge.js'
import {
  extractJsonLd,
  findBusinessNode,
  normalizeOpeningHours,
  extractGeo,
} from './parse-json-ld.js'
import type { OverrideEntry } from '../src/types/overrides.js'

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const SCRAPE_ATTRS_PATH = path.join(ROOT, 'src/data/scrape-attributes.json')
const CHAIN_URL_MAP_PATH = path.join(ROOT, 'scripts/cache/chain-url-map.json')
const STORES_JSON_PATH = path.join(ROOT, 'src/data/stores.json')

const TAITO_API =
  'https://www.taito.co.jp/api/StoreList/?query=&offset=0&limit=10000&sortName=&isDesc=true&mode=0'
const NAMCO_SEARCH_API =
  'https://bandainamco-am.co.jp/data/search/result?domain=spot&rows=1000&start=0'
const NAMCO_BASE = 'https://bandainamco-am.co.jp'

const UA = 'ls-exvs-map/scraper (+https://github.com/rioj7927/ls-exvs-map; Issue#107)'

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

interface OurStore {
  id: string
  name: string
  address: string
}

interface ScrapedAttrs {
  officialUrl: string
  businessHours?: string
  lat?: number
  lng?: number
}

interface ChainUrlMap {
  lastUpdated: string
  /**
   * タイトー本体「タイトーステーション」旗艦店の手動キュレーション・シード。
   * `our storeId` → 公式店舗ページURL（`https://www.taito.co.jp/store/{taitoId}`）。
   * これら旗艦店は公開一覧APIに存在しないため、ID は一度だけ収集して固定する。
   * scraper はこのシードを **読み取るだけで上書きしない**（キュレーションを保護）。
   * 月次CIは登録済みURLを叩いて営業時間を最新化する。
   */
  taitoFlagshipSeed?: Record<string, string>
  mappings: {
    taito: Record<string, string>
    namco: Record<string, string>
  }
  unmatched: {
    taito: string[]
    namco: string[]
  }
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return res.text()
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** タイトー API の "9:00～21:00" 形式 → "09:00-21:00" へ正規化（後続テキストは無視） */
export function normalizeTaitoHours(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}:\d{2})[～~](\d{1,2}:\d{2})/)
  if (!m) return null
  const padTime = (t: string): string => {
    const [h, mm] = t.split(':')
    const padded = String(Number(h)).padStart(2, '0')
    return `${padded}:${mm}`
  }
  const opens = padTime(m[1])
  let closes = padTime(m[2])
  if (closes === '00:00') closes = '24:00'
  return `${opens}-${closes}`
}

/**
 * namco 店舗名から照合キーを生成。
 * - 先頭 "namco" を除去
 * - NFKC 正規化＋小文字化＋空白除去
 * - 「店」を全除去（API は "namcoウイングベイ小樽店"、我々は "namcoウイングベイ小樽" の差を吸収。
 *   さらに API の "イオンレイクタウン店 mori北" のような中間「店」も吸収する）
 * 例: "namco 池袋店" → "池袋"
 */
export function normalizeNamcoName(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^namco\s*/, '')
    .replace(/店/g, '')
    .replace(/\s+/g, '')
    .trim()
}

/** updatedAt を除いた JSON 比較で実体差分を判定 */
export function hasMeaningfulDiff(prev: unknown, next: unknown): boolean {
  const strip = (obj: unknown): unknown =>
    JSON.parse(JSON.stringify(obj, (k, v) => (k === 'updatedAt' ? undefined : v)))
  return JSON.stringify(strip(prev)) !== JSON.stringify(strip(next))
}

/** OverrideEntry を組み立てる */
function buildEntry(attrs: ScrapedAttrs, today: string): OverrideEntry {
  const entry: OverrideEntry = {
    source: 'auto-scrape',
    officialUrl: attrs.officialUrl,
    updatedAt: today,
  }
  if (attrs.businessHours) entry.businessHours = attrs.businessHours
  if (attrs.lat !== undefined) entry.lat = attrs.lat
  if (attrs.lng !== undefined) entry.lng = attrs.lng
  return entry
}

// ---------------------------------------------------------------------------
// タイトー pipeline
// ---------------------------------------------------------------------------

// 実際のレスポンス: Array<{ StoreData: {...}, LanguageStoreMaster: {...} }>
interface TaitoStoreData {
  StoreID?: string
  StoreName?: string
  CountryCode?: string
  Status?: string
  BusinessHours?: string
  Latitude?: number | string
  Longitude?: number | string
  State?: string   // 都道府県
  City?: string    // 市区
  Address1?: string // 番地
  Address2?: string // ビル名（照合には使わない）
}

interface TaitoResponseItem {
  StoreData?: TaitoStoreData
}

export async function scrapeTaito(
  ourStores: OurStore[],
  options: { delayMs?: number; log?: (msg: string) => void } = {},
): Promise<{
  matched: Map<string, ScrapedAttrs>
  unmatched: string[]
}> {
  const { delayMs = 0, log = console.log } = options
  log('[taito] API からデータ取得中...')

  const json = await fetchJson(TAITO_API)

  // レスポンスは Array<{ StoreData: {...} }>
  const raw: TaitoResponseItem[] = Array.isArray(json) ? json : []
  const activeItems = raw
    .map((r) => r.StoreData)
    .filter((s): s is TaitoStoreData => !!s && s.CountryCode === 'JP' && s.Status === 'A')

  log(`[taito] 取得: ${activeItems.length} 件`)

  // 住所正規化マップ（our stores）
  const taitoOurStores = ourStores.filter((s) => s.name.includes('タイトー'))
  const ourByAddr = new Map<string, OurStore>()
  for (const s of taitoOurStores) {
    ourByAddr.set(normalizeAddress(s.address), s)
  }

  const matched = new Map<string, ScrapedAttrs>()
  const unmatched: string[] = []

  for (const item of activeItems) {
    // Address2（ビル名）はジオコードと一致しないので除外し State+City+Address1 で照合
    const rawAddr = `${item.State ?? ''}${item.City ?? ''}${item.Address1 ?? ''}`.trim()
    if (!rawAddr) continue

    const normAddr = normalizeAddress(rawAddr)
    const store = ourByAddr.get(normAddr)
    if (!store) {
      unmatched.push(`${item.StoreName ?? '?'}@${rawAddr}`)
      continue
    }

    const officialUrl = item.StoreID
      ? `https://www.taito.co.jp/store/${item.StoreID}`
      : 'https://www.taito.co.jp/store/'

    const businessHours =
      item.BusinessHours ? (normalizeTaitoHours(item.BusinessHours) ?? undefined) : undefined

    const lat = item.Latitude !== undefined ? Number(item.Latitude) : undefined
    const lng = item.Longitude !== undefined ? Number(item.Longitude) : undefined

    matched.set(store.id, {
      officialUrl,
      businessHours,
      lat: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
      lng: lng !== undefined && Number.isFinite(lng) ? lng : undefined,
    })
  }

  log(`[taito] 名寄せ成功: ${matched.size}/${taitoOurStores.length}、未一致: ${unmatched.length}`)
  if (delayMs > 0) await delay(delayMs)
  return { matched, unmatched }
}

// ---------------------------------------------------------------------------
// タイトー旗艦店（シード経由）pipeline
// ---------------------------------------------------------------------------

/**
 * 旗艦「タイトーステーション」店をシード（storeId→公式URL）から取得する。
 * 各 `/store/{id}` ページの JSON-LD から営業時間を読み、公式URLはシード値を採用する。
 * （旗艦ページの JSON-LD には geo が無いため lat/lng は上書きしない＝既存ジオコード維持）
 */
export async function scrapeTaitoFlagship(
  seed: Record<string, string>,
  options: {
    delayMs?: number
    log?: (msg: string) => void
    fetcher?: (url: string) => Promise<string>
  } = {},
): Promise<{ matched: Map<string, ScrapedAttrs>; unmatched: string[] }> {
  const { delayMs = 3000, log = console.log, fetcher = fetchText } = options
  const matched = new Map<string, ScrapedAttrs>()
  const unmatched: string[] = []

  const entries = Object.entries(seed)
  if (entries.length === 0) {
    log('[taito-flagship] シード未登録（taitoFlagshipSeed が空）')
    return { matched, unmatched }
  }
  log(`[taito-flagship] シード ${entries.length} 件を取得`)

  let i = 0
  for (const [storeId, officialUrl] of entries) {
    i++
    try {
      if (i > 1 && delayMs > 0) await delay(delayMs)
      const html = await fetcher(officialUrl)
      const node = findBusinessNode(extractJsonLd(html))
      const { hours } = normalizeOpeningHours(node?.openingHoursSpecification)
      matched.set(storeId, { officialUrl, businessHours: hours ?? undefined })
    } catch (err) {
      log(`[taito-flagship] 取得失敗 ${officialUrl}: ${String(err)}`)
      unmatched.push(`${storeId} (${officialUrl})`)
    }
  }

  log(`[taito-flagship] 取得完了: ${matched.size}/${entries.length} 件`)
  return { matched, unmatched }
}

// ---------------------------------------------------------------------------
// namco pipeline
// ---------------------------------------------------------------------------

// 実際のレスポンス: { hits: { total: N, hits: Array<{ _source: { name, url, ... } }> } }
interface NamcoSource {
  name?: string
  url?: string
}

export async function scrapeNamco(
  ourStores: OurStore[],
  options: {
    delayMs?: number
    log?: (msg: string) => void
    fetcher?: (url: string) => Promise<string>
  } = {},
): Promise<{
  matched: Map<string, ScrapedAttrs>
  unmatched: string[]
}> {
  const { delayMs = 1500, log = console.log, fetcher = fetchText } = options
  log('[namco] BN AM 検索 API からデータ取得中...')

  const searchJson = await fetchJson(NAMCO_SEARCH_API)
  const sources: NamcoSource[] = []

  // レスポンス: { hits: { hits: [{ _source: {...} }] } }
  if (searchJson && typeof searchJson === 'object') {
    const outer = searchJson as Record<string, unknown>
    const hitsObj = outer['hits']
    if (hitsObj && typeof hitsObj === 'object') {
      const h = hitsObj as Record<string, unknown>
      if (Array.isArray(h['hits'])) {
        for (const hit of h['hits'] as Array<Record<string, unknown>>) {
          const src = hit['_source']
          if (src && typeof src === 'object') sources.push(src as NamcoSource)
        }
      }
    }
  }

  // game_center/loc URL を持ち、名前に namco を含むもの
  const gameCenterDocs = sources.filter((s) => {
    const u = s.url ?? ''
    const n = (s.name ?? '').toLowerCase()
    return u.includes('game_center/loc') && n.includes('namco')
  })
  log(`[namco] game_center/loc + namco フィルタ後: ${gameCenterDocs.length} 件`)

  // API 側の候補（正規化キー付き）を整える
  interface NamcoCandidate {
    key: string
    slug: string
    rawName: string
  }
  const candidates: NamcoCandidate[] = []
  for (const doc of gameCenterDocs) {
    const rawName = doc.name ?? ''
    const rawUrl = doc.url ?? ''
    const slug = rawUrl.match(/game_center\/loc\/([^/]+)/)?.[1]
    if (!slug) continue
    candidates.push({ key: normalizeNamcoName(rawName), slug, rawName })
  }

  // namco our stores を「完全一致 → 前方一致」の順で照合する。
  // 前方一致は API 側にだけ付く施設サフィックス（"…ワンダーボウル" 等）を吸収するため。
  const namcoOurStores = ourStores.filter((s) => s.name.toLowerCase().includes('namco'))
  const urlMap = new Map<string, { store: OurStore; slug: string }>()
  const unmatchedNames: string[] = []

  for (const store of namcoOurStores) {
    const key = normalizeNamcoName(store.name)
    const exact = candidates.filter((c) => c.key === key)
    const hit = exact.length > 0 ? exact : candidates.filter((c) => c.key.startsWith(key))
    if (hit.length > 0) {
      // 同一店舗が複数エントリ（重複/施設違い）でも slug は同じになる前提で先頭採用
      urlMap.set(store.id, { store, slug: hit[0].slug })
    } else {
      unmatchedNames.push(`${store.name} (key: ${key})`)
    }
  }

  log(`[namco] 名寄せ成功: ${urlMap.size}/${namcoOurStores.length}、未一致: ${unmatchedNames.length}`)

  // 各ページから JSON-LD を取得
  const matched = new Map<string, ScrapedAttrs>()
  const fetchFailed: string[] = []

  let i = 0
  for (const [storeId, { store, slug }] of urlMap) {
    i++
    const pageUrl = `${NAMCO_BASE}/game_center/loc/${slug}/`
    log(`[namco] (${i}/${urlMap.size}) ${store.name} → ${pageUrl}`)
    try {
      if (i > 1 && delayMs > 0) await delay(delayMs)
      const html = await fetcher(pageUrl)
      const node = findBusinessNode(extractJsonLd(html))
      const { hours } = normalizeOpeningHours(node?.openingHoursSpecification)
      const geo = extractGeo(node)
      const officialUrl = node?.url ?? pageUrl

      matched.set(storeId, {
        officialUrl,
        businessHours: hours ?? undefined,
        lat: geo?.lat,
        lng: geo?.lng,
      })
    } catch (err) {
      log(`[namco] ページ取得失敗 ${pageUrl}: ${String(err)}`)
      fetchFailed.push(`${store.name} (${pageUrl})`)
    }
  }

  const unmatched = [...unmatchedNames, ...fetchFailed]
  log(`[namco] JSON-LD 取得完了: ${matched.size} 件`)
  return { matched, unmatched }
}

// ---------------------------------------------------------------------------
// メインエントリ
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  const storesJson = JSON.parse(fs.readFileSync(STORES_JSON_PATH, 'utf8')) as {
    stores: OurStore[]
  }
  const ourStores = storesJson.stores

  // 既存キャッシュ（旗艦店シードを読む。ファイルが無くても落とさない）
  const prevCache = readChainUrlMap()

  // --- タイトー Fステーション（StoreList API・自動） ---
  const taitoResult = await scrapeTaito(ourStores)

  // --- タイトー旗艦店（手動シード経由） ---
  const flagshipResult = await scrapeTaitoFlagship(prevCache.taitoFlagshipSeed ?? {})

  // --- namco ---
  const namcoResult = await scrapeNamco(ourStores)

  // --- scrape-attributes.json を組み立て ---
  // マージ順は「旗艦シード → StoreList(F) → namco」。
  // 旗艦JSON-LDには geo が無いため先に置き、geo付きの StoreList(F) が重複店で勝つようにする
  // （シードは旗艦/F両方の /store/{id} を含みうるが、F店は StoreList の geo を優先）。
  const scrapeOverrides: Record<string, OverrideEntry> = {}

  for (const [storeId, attrs] of flagshipResult.matched) {
    scrapeOverrides[storeId] = buildEntry(attrs, today)
  }
  for (const [storeId, attrs] of taitoResult.matched) {
    scrapeOverrides[storeId] = buildEntry(attrs, today)
  }
  for (const [storeId, attrs] of namcoResult.matched) {
    scrapeOverrides[storeId] = buildEntry(attrs, today)
  }

  const newScrapeAttrs = { overrides: scrapeOverrides }

  // --- 差分ゲート ---
  const existingScrape = JSON.parse(fs.readFileSync(SCRAPE_ATTRS_PATH, 'utf8')) as unknown

  if (!hasMeaningfulDiff(existingScrape, newScrapeAttrs)) {
    console.log('[scrape] 実体差分なし、スキップ')
  } else {
    fs.writeFileSync(SCRAPE_ATTRS_PATH, JSON.stringify(newScrapeAttrs, null, 2) + '\n')
    console.log(`[scrape] scrape-attributes.json を更新 (${Object.keys(scrapeOverrides).length} 件)`)
  }

  // --- chain-url-map.json を更新（旗艦店シードは読み取り専用＝保全） ---
  const taitoMappings: Record<string, string> = {}
  for (const [storeId, attrs] of taitoResult.matched) {
    taitoMappings[storeId] = attrs.officialUrl
  }
  for (const [storeId, attrs] of flagshipResult.matched) {
    taitoMappings[storeId] = attrs.officialUrl
  }
  const namcoMappings: Record<string, string> = {}
  for (const [storeId, attrs] of namcoResult.matched) {
    namcoMappings[storeId] = attrs.officialUrl
  }

  // unmatched は「我々のチェーン店のうち auto-scrape 属性が付かなかった店」を記録する。
  // （StoreList側に居るが我々のDBに無い店＝対象外、はノイズなので載せない。管理者の
  //  アクションは「未取得の自店をシード追加 or overrides.json で手当て」なので自店基準が有用）
  const coveredIds = new Set(Object.keys(scrapeOverrides))
  const uncovered = (match: (name: string) => boolean): string[] =>
    ourStores
      .filter((s) => match(s.name) && !coveredIds.has(s.id))
      .map((s) => `${s.name}@${s.address}`)
  const taitoUncovered = uncovered((n) => n.includes('タイトー'))
  const namcoUncovered = uncovered((n) => n.toLowerCase().includes('namco'))

  const chainUrlMap: ChainUrlMap = {
    lastUpdated: new Date().toISOString(),
    taitoFlagshipSeed: prevCache.taitoFlagshipSeed ?? {},
    mappings: { taito: taitoMappings, namco: namcoMappings },
    unmatched: { taito: taitoUncovered, namco: namcoUncovered },
  }
  fs.writeFileSync(CHAIN_URL_MAP_PATH, JSON.stringify(chainUrlMap, null, 2) + '\n')
  console.log('[scrape] chain-url-map.json を更新')

  // 未取得の自店があれば警告（CI でも気づけるよう）
  const totalUncovered = taitoUncovered.length + namcoUncovered.length
  if (totalUncovered > 0) {
    console.warn(
      `[scrape] 未取得の自店: taito ${taitoUncovered.length}、namco ${namcoUncovered.length} 件` +
        `（chain-url-map.json の unmatched 参照・シード追加 or overrides.json で手当て）`,
    )
  }
}

/** chain-url-map.json を安全に読む（無い/壊れていても既定値を返す） */
function readChainUrlMap(): ChainUrlMap {
  const fallback: ChainUrlMap = {
    lastUpdated: '',
    taitoFlagshipSeed: {},
    mappings: { taito: {}, namco: {} },
    unmatched: { taito: [], namco: [] },
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CHAIN_URL_MAP_PATH, 'utf8')) as Partial<ChainUrlMap>
    return { ...fallback, ...raw }
  } catch {
    return fallback
  }
}

// 直接実行時のみ起動
const entry = process.argv[1]
if (entry && (import.meta.url === `file://${entry}` || import.meta.url.endsWith(entry))) {
  main().catch((err) => {
    console.error('[scrape] 失敗:', err)
    process.exitCode = 1
  })
}
