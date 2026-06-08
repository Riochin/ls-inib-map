import { parse } from 'node-html-parser'
import type { RawStore, ScrapeResult, SiteKey } from './types'

/**
 * 公式サイトスクレイパ（Req2.1, 2.2, 2.6, 3.2）。
 *
 * 公式2サイト（ラスサバ / イニブ）は同一の Bandai Namco AM プラットフォーム上にあり、
 * `./list?area=JP-XX`（東京は `&sw=1`=23区 / `&sw=0`=多摩）という共通URL構造で
 * 地域別店舗一覧をサーバーサイドレンダリングの静的HTMLとして返す（research.md 参照）。
 *
 * 本モジュールは「area コード列挙 → 各一覧HTMLを fetch → DOMパースで店舗抽出」を担い、
 * area 単位の成否・件数バリデーションで非破壊性（Req2.6）を確保する。
 */

// ---------------------------------------------------------------------------
// サイト設定 / エリア列挙
// ---------------------------------------------------------------------------

interface SiteConfig {
  /** 一覧URLのベース（`?area=...` を付与して使用） */
  listBase: string
}

const SITE_CONFIGS: Record<SiteKey, SiteConfig> = {
  jojols: {
    listBase: 'https://bandainamco-am.co.jp/am/vg/jojols/location/list',
  },
  gundam: {
    listBase: 'https://gundam-vs.jp/extreme/ac2ib/location/list',
  },
}

/** スクレイプ対象サイト（既定: 両サイト） */
const ALL_SITES: SiteKey[] = ['jojols', 'gundam']

/** 1地域の取得対象（東京は sw パラメータで2分割される） */
export interface AreaTarget {
  /** 地域コード（JP-01〜JP-47） */
  area: string
  /** 追加クエリ（東京の `sw=1`/`sw=0` 等） */
  params?: Record<string, string>
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * 全47都道府県の取得対象。東京（JP-13）は 23区（sw=1）/ 多摩（sw=0）の2分割。
 */
export const ALL_AREA_TARGETS: AreaTarget[] = (() => {
  const targets: AreaTarget[] = []
  for (let i = 1; i <= 47; i++) {
    const area = `JP-${pad2(i)}`
    if (area === 'JP-13') {
      targets.push({ area, params: { sw: '1' } }, { area, params: { sw: '0' } })
    } else {
      targets.push({ area })
    }
  }
  return targets
})()

/** site と取得対象から一覧URLを組み立てる */
export function buildListUrl(site: SiteKey, target: AreaTarget): string {
  const search = new URLSearchParams({ area: target.area, ...(target.params ?? {}) })
  return `${SITE_CONFIGS[site].listBase}?${search.toString()}`
}

// ---------------------------------------------------------------------------
// DOM抽出（純関数）
// ---------------------------------------------------------------------------

/**
 * 一覧HTMLのDOMセレクタ。両サイトは同一プラットフォームのため共通の構造を想定する。
 * 公式HTML構造が変化した場合の調整点はここに集約する（変化検知は件数バリデーションが担保）。
 */
const LIST_SELECTORS = {
  item: '.location-list__item',
  name: '.location-list__name',
  address: '.location-list__address',
  machine: '.location-list__machine',
} as const

/** `detail?loc_id=XXX` 形式の href から loc_id を取り出す */
function extractLocId(href: string): string | null {
  return href.match(/loc_id=([^&]+)/)?.[1] ?? null
}

/** 「N台設置」等のテキストから設置台数を取り出す（無ければ 0） */
function extractMachineCount(text: string): number {
  const m = text.match(/(\d+)\s*台/)
  return m ? Number.parseInt(m[1], 10) : 0
}

/**
 * 1地域の一覧HTMLから店舗を抽出する純関数（副作用なし・テスト可能）。
 * 必須項目（名前/住所/loc_id）を欠く要素はスキップする。
 */
export function parseListHtml(html: string, site: SiteKey, area: string): RawStore[] {
  const root = parse(html)
  const stores: RawStore[] = []

  for (const item of root.querySelectorAll(LIST_SELECTORS.item)) {
    const nameEl = item.querySelector(LIST_SELECTORS.name)
    const name = nameEl?.text.trim() ?? ''
    const locId = extractLocId(nameEl?.getAttribute('href') ?? '')
    const address = item.querySelector(LIST_SELECTORS.address)?.text.trim() ?? ''
    const machineText = item.querySelector(LIST_SELECTORS.machine)?.text ?? ''

    if (!name || !address || !locId) continue

    stores.push({
      site,
      locId,
      name,
      address,
      machineCount: extractMachineCount(machineText),
      area,
    })
  }

  return stores
}

// ---------------------------------------------------------------------------
// バリデーション（純関数・Req2.6）
// ---------------------------------------------------------------------------

/** area 単位で「前回比これ未満なら急減＝不確定」とみなす比率の既定値 */
const DEFAULT_MIN_AREA_RATIO = 0.5
/** 全国総数が「前回比これ未満なら全体異常」とみなす比率の既定値 */
const DEFAULT_MIN_NATIONAL_RATIO = 0.5

/**
 * area 単位の信頼性判定。0件・前回比急減を不確定（false）とみなす。
 * 比較対象（前回件数）が無い初回は、取得できている限り信頼する。
 */
export function isAreaReliable(
  scrapedCount: number,
  prevCount: number | undefined,
  minRatio: number = DEFAULT_MIN_AREA_RATIO,
): boolean {
  if (scrapedCount <= 0) return false
  if (prevCount === undefined || prevCount <= 0) return true
  return scrapedCount >= prevCount * minRatio
}

/**
 * 全国総数の異常判定。前回比で極端に減少した場合に true（全体中断の根拠）。
 * 比較対象が無い初回は正常とみなす。
 */
export function isNationalTotalAnomalous(
  scrapedTotal: number,
  prevTotal: number | undefined,
  minRatio: number = DEFAULT_MIN_NATIONAL_RATIO,
): boolean {
  if (prevTotal === undefined || prevTotal <= 0) return false
  return scrapedTotal < prevTotal * minRatio
}

/**
 * 全国総数の急減を検知した際に投げる中断エラー。
 * 既存 `stores.json` を破壊せず、呼び出し側（パイプライン）は非ゼロ終了する。
 */
export class ScrapeAbortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScrapeAbortError'
  }
}

// ---------------------------------------------------------------------------
// オーケストレーション
// ---------------------------------------------------------------------------

const DEFAULT_DELAY_MS = 1000

/** 公式サイトへの過度な負荷を避けるための待機（既定: setTimeout） */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 一覧HTMLを取得する既定フェッチャ。非2xxは例外として area 失敗扱いにする */
async function defaultFetcher(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ls-exvs-map-updater (+https://github.com/)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

export interface ScrapeDeps {
  /** HTML取得関数（テスト時はフィクスチャ注入）。失敗時は例外を投げる */
  fetcher?: (url: string) => Promise<string>
  /** リクエスト間の待機関数（テスト時はモック注入） */
  sleep?: (ms: number) => Promise<void>
  /** リクエスト間隔（ミリ秒） */
  delayMs?: number
  /** 取得対象エリア（既定: 全国 {@link ALL_AREA_TARGETS}） */
  areas?: AreaTarget[]
  /** 対象サイト（既定: 両サイト） */
  sites?: SiteKey[]
  /** 前回データの area 別件数（急減判定の基準・任意） */
  prevAreaCounts?: Map<string, number>
  /** 前回データの全国総数（全体異常判定の基準・任意） */
  prevTotal?: number
}

interface AreaAccumulator {
  /** その area の全フェッチが成功したか */
  ok: boolean
  /** 取得した店舗の生件数（両サイト合算） */
  count: number
  /** 取得した店舗 */
  stores: RawStore[]
}

/**
 * 公式2サイトの全国一覧をスクレイプし、取得成功エリア集合とともに返す。
 *
 * - area 単位でフェッチ成否・件数を検証し、失敗/0件/前回比急減のエリアは
 *   `scrapedAreas` から除外し、その店舗も出力に含めない（前回状態は merger が維持）。
 * - 全国総数が前回比で極端に減少した場合は {@link ScrapeAbortError} を投げ、
 *   既存データを破壊せず中断する（Req2.6）。
 */
export async function scrapeStores(deps: ScrapeDeps = {}): Promise<ScrapeResult> {
  const fetcher = deps.fetcher ?? defaultFetcher
  const sleep = deps.sleep ?? defaultSleep
  const delayMs = deps.delayMs ?? DEFAULT_DELAY_MS
  const targets = deps.areas ?? ALL_AREA_TARGETS
  const sites = deps.sites ?? ALL_SITES

  const perArea = new Map<string, AreaAccumulator>()
  const acc = (area: string): AreaAccumulator => {
    let entry = perArea.get(area)
    if (!entry) {
      entry = { ok: true, count: 0, stores: [] }
      perArea.set(area, entry)
    }
    return entry
  }

  for (const target of targets) {
    for (const site of sites) {
      // 過負荷回避: 各リクエスト前に間隔を空ける
      await sleep(delayMs)
      const entry = acc(target.area)
      try {
        const html = await fetcher(buildListUrl(site, target))
        const stores = parseListHtml(html, site, target.area)
        entry.count += stores.length
        entry.stores.push(...stores)
      } catch (err) {
        // area 単位の取得失敗 → 当該 area を不確定にマーク
        entry.ok = false
        console.error(`[scrape] failed: ${site} ${target.area}:`, err)
      }
    }
  }

  const scrapedAreas = new Set<string>()
  const stores: RawStore[] = []
  let nationalTotal = 0

  for (const [area, entry] of perArea) {
    const reliable = entry.ok && isAreaReliable(entry.count, deps.prevAreaCounts?.get(area))
    if (!reliable) {
      console.warn(`[scrape] area excluded as uncertain: ${area} (count=${entry.count}, ok=${entry.ok})`)
      continue
    }
    scrapedAreas.add(area)
    stores.push(...entry.stores)
    nationalTotal += entry.count
  }

  if (isNationalTotalAnomalous(nationalTotal, deps.prevTotal)) {
    throw new ScrapeAbortError(
      `全国総数が前回比で極端に減少（scraped=${nationalTotal}, prev=${deps.prevTotal}）。既存データを破壊せず中断します。`,
    )
  }

  return { stores, scrapedAreas }
}
