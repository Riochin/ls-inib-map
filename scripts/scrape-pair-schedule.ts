import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { parse } from 'node-html-parser'
import type { PairScheduleFile, PairScheduleMonth } from '@/types/pair-schedule'

/**
 * ラスサバ「ペア戦開催日程」スクレイパ＋差分ゲート。
 *
 * 公式「ラスサバnet」（https://jojols-w.bn-am.net）は毎月、来月のペア戦開催日程を
 * お知らせ記事として告知する。本モジュールは「一覧HTMLから詳細IDを列挙 → 各詳細HTMLを
 * 取得 → タイトルが『N月のペア戦開催日程』の記事だけをパースして開催日を抽出」を担い、
 * 取得済みの月を `src/data/pair-schedule.json` に非破壊で蓄積する。
 *
 * `scripts/scrape.ts` と同様、外部I/O（HTML取得・待機・ファイルIO）は依存注入で差し替え
 * 可能にし、固定フィクスチャからの検証を可能にする。生成物はビルド時にバンドルされ、
 * 週次のGitHub Actionsがコミット→push→Vercel再デプロイで反映する（ランタイムfetchなし）。
 */

// ---------------------------------------------------------------------------
// 抽出パターン
// ---------------------------------------------------------------------------

/** 詳細ページURL（一覧の `<a href>` から ID を取り出す） */
const DETAIL_HREF_RE = /\/web\/info\/detail\/([A-Za-z0-9]+)/g
/** ペア戦告知のタイトル（`5月のペア戦開催日程`）。月のみで年は含まない */
const PAIR_TITLE_RE = /^(\d{1,2})月のペア戦開催日程$/
/** 掲載日（`2026年04月15日(水)`）。最初の一致を採用する */
const POSTED_DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/
/** 開催日程の各行（`・5月1日(金) 12:00～`）。月日のみ取り出す */
const DATE_LINE_RE = /・\s*(\d{1,2})月(\d{1,2})日/

/** 詳細ページURLを ID から組み立てる */
export function buildDetailUrl(id: string): string {
  return `https://jojols-w.bn-am.net/web/info/detail/${id}`
}

/** 一覧ページURL */
export const INFO_LIST_URL = 'https://jojols-w.bn-am.net/web/info'

// ---------------------------------------------------------------------------
// DOM抽出（純関数）
// ---------------------------------------------------------------------------

/**
 * 一覧HTMLから詳細ページIDを順序保持・重複排除で列挙する。
 * バナー画像リンク（`<a href=".../web/info/detail/{ID}">`）の href から ID を取り出す。
 */
export function extractDetailIds(html: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(DETAIL_HREF_RE)) {
    const id = m[1]
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

/** 掲載日テキストから {year, month, day} を取り出す（不一致は null） */
function parsePostedDate(text: string): { year: number; month: number; day: number } | null {
  const m = POSTED_DATE_RE.exec(text)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/**
 * タイトル月と掲載日から対象年を推定する。
 * 掲載月より小さいタイトル月（例: 12月掲載の「1月のペア戦…」）は翌年とみなす。
 * 翌月・同月の告知は掲載年のままになる。
 */
export function inferYear(titleMonth: number, postedYear: number, postedMonth: number): number {
  return titleMonth < postedMonth ? postedYear + 1 : postedYear
}

/** `yyyy-mm-dd` へ整形（ゼロ埋め） */
function toIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/** 日リストから ISO 日付（昇順・重複排除）を組み立てる */
export function buildIsoDates(year: number, month: number, days: number[]): string[] {
  const set = new Set(days.map((d) => toIso(year, month, d)))
  return [...set].sort()
}

/**
 * 詳細HTMLをパースする。タイトルが『N月のペア戦開催日程』でなければ `null`。
 *
 * 本文（`.txarea.info`）は `<br>` 区切りの行を innerHTML から分割して各行を判定する。
 * `text` 連結だと `・5月1日` のように行が連結して日付抽出を取りこぼすため、innerHTML を
 * `<br>` で割るのが堅牢。タイトル月と一致する日付のみ採用する（混入防止）。
 */
export function parsePairDetail(
  html: string,
  sourceUrl: string,
  fetchedAt: string,
): PairScheduleMonth | null {
  const root = parse(html)

  const title = root.querySelector('div.h3 h3')?.text.trim() ?? ''
  const titleMatch = PAIR_TITLE_RE.exec(title)
  if (!titleMatch) return null
  const month = Number(titleMatch[1])

  const posted = parsePostedDate(root.text)
  if (!posted) return null

  const body = root.querySelector('.txarea.info')
  if (!body) return null

  const days: number[] = []
  for (const line of body.innerHTML.split(/<br\s*\/?>/i)) {
    const m = DATE_LINE_RE.exec(line)
    if (!m) continue
    const lineMonth = Number(m[1])
    if (lineMonth !== month) continue // タイトル月以外の日付は採用しない
    days.push(Number(m[2]))
  }
  if (days.length === 0) return null

  const year = inferYear(month, posted.year, posted.month)
  return {
    year,
    month,
    pairDates: buildIsoDates(year, month, days),
    sourceUrl,
    postedAt: toIso(posted.year, posted.month, posted.day),
    fetchedAt,
  }
}

// ---------------------------------------------------------------------------
// マージ（非破壊蓄積）
// ---------------------------------------------------------------------------

/** (year, month) の合成キー */
function monthKey(m: { year: number; month: number }): string {
  return `${m.year}-${m.month}`
}

/**
 * 既存の月別日程に今回取得分を upsert する。
 * 過去月は保持し、同一 (year, month) は今回取得で置き換える。(year, month) 昇順で返す。
 */
export function mergePairSchedule(
  prev: PairScheduleMonth[],
  scraped: PairScheduleMonth[],
): PairScheduleMonth[] {
  const byKey = new Map<string, PairScheduleMonth>()
  for (const m of prev) byKey.set(monthKey(m), m)
  for (const m of scraped) byKey.set(monthKey(m), m)
  return [...byKey.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  )
}

// ---------------------------------------------------------------------------
// オーケストレーション
// ---------------------------------------------------------------------------

const DEFAULT_DELAY_MS = 500
const DEFAULT_FETCH_TIMEOUT_MS = 15000

/** 公式サイトへの過度な負荷を避けるための待機（既定: setTimeout） */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * HTMLを取得する既定フェッチャ。非2xxは例外。`timeoutMs` で無応答接続を打ち切る。
 */
function defaultFetcher(timeoutMs: number): (url: string) => Promise<string> {
  return async (url: string) => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ls-exvs-map-updater (+https://github.com/)' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return res.text()
  }
}

export interface PairScrapeDeps {
  /** HTML取得関数（テスト時はフィクスチャ注入）。失敗時は例外を投げる */
  fetcher?: (url: string) => Promise<string>
  /** リクエスト間の待機関数（テスト時はモック注入） */
  sleep?: (ms: number) => Promise<void>
  /** リクエスト間隔（ミリ秒） */
  delayMs?: number
  /** 既定フェッチャの1リクエストタイムアウト（ミリ秒） */
  timeoutMs?: number
  /** 各月に記録する取得時刻（ISO 8601・呼び出し側が注入） */
  fetchedAt: string
  /** 進捗ログ出力（既定: console.log） */
  log?: (msg: string) => void
}

/**
 * 一覧→各詳細を取得し、ペア戦告知だけをパースして月別日程を返す。
 *
 * - 詳細1件の取得・パース失敗は握りつぶし、他の月の取得を継続する（1ページの不良で
 *   全体を落とさない）。一覧取得自体の失敗は例外として伝播する（既存データ非破壊）。
 * - 番兵ガード: 一覧からIDが取れた（>0）のにペア戦の月が0件なら、HTML構造変化とみなし
 *   例外で中断する。無言でスルーして「来月がいつまでも出ない」状態を防ぐ。
 */
export async function scrapePairSchedule(deps: PairScrapeDeps): Promise<PairScheduleMonth[]> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const fetcher = deps.fetcher ?? defaultFetcher(timeoutMs)
  const sleep = deps.sleep ?? defaultSleep
  const delayMs = deps.delayMs ?? DEFAULT_DELAY_MS
  const log = deps.log ?? ((msg: string) => console.log(msg))

  const listHtml = await fetcher(INFO_LIST_URL)
  const ids = extractDetailIds(listHtml)
  log(`[pair] 一覧から詳細ID ${ids.length}件を抽出`)

  const months: PairScheduleMonth[] = []
  let done = 0
  for (const id of ids) {
    await sleep(delayMs)
    done++
    const url = buildDetailUrl(id)
    try {
      const html = await fetcher(url)
      const parsed = parsePairDetail(html, url, deps.fetchedAt)
      if (parsed) {
        months.push(parsed)
        log(`[pair] (${done}/${ids.length}) ${parsed.year}年${parsed.month}月: ${parsed.pairDates.length}日`)
      }
    } catch (err) {
      // 詳細単位の失敗はスキップ（他の月の取得を妨げない）
      log(`[pair] (${done}/${ids.length}) ${id}: 失敗 — ${String(err)}`)
    }
  }

  if (ids.length > 0 && months.length === 0) {
    throw new Error(
      `[pair] 一覧から${ids.length}件取得したがペア戦告知を0件しか解釈できませんでした。` +
        `HTML構造が変化した可能性があります（既存データは据え置き）。`,
    )
  }

  log(`[pair] ペア戦告知 ${months.length}件を取得`)
  return months
}

// ---------------------------------------------------------------------------
// 差分ゲート（揮発フィールド除外）
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

/**
 * 比較対象から揮発フィールド（top-level `updatedAt`・各月 `fetchedAt`）を除外する。
 * これらは中身が同じでも毎回変わるため、除外しないと週次ジョブが空コミットを量産する。
 */
function stripVolatile(file: PairScheduleFile): unknown {
  return {
    months: file.months.map(({ fetchedAt: _fetchedAt, ...rest }) => rest),
  }
}

/**
 * 現行JSONと生成JSONを揮発フィールド除外で正規化比較し、実体差分があれば true。
 * 現行が存在しない（初回生成）場合は常に差分ありとみなす。
 */
export function hasMeaningfulDiff(
  current: PairScheduleFile | null,
  next: PairScheduleFile,
): boolean {
  if (!current) return true
  return (
    JSON.stringify(canonicalize(stripVolatile(current))) !==
    JSON.stringify(canonicalize(stripVolatile(next)))
  )
}

// ---------------------------------------------------------------------------
// ファイルIO（差分ゲート付き書き込み）
// ---------------------------------------------------------------------------

/** 生成物 `pair-schedule.json` の既定パス */
export const DEFAULT_PAIR_SCHEDULE_PATH = 'src/data/pair-schedule.json'

/** 現行 `pair-schedule.json` を読み込む（無ければ null） */
export function loadPairScheduleFile(
  path: string = DEFAULT_PAIR_SCHEDULE_PATH,
): PairScheduleFile | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as PairScheduleFile
}

/**
 * 差分ゲート付き書き込み。
 * 現行と実体差分が無ければ書き込まず false を返す（コミットを発生させない）。
 * 差分があれば `pair-schedule.json` を書き、true を返す。
 */
export function writePairScheduleFileIfChanged(
  next: PairScheduleFile,
  path: string = DEFAULT_PAIR_SCHEDULE_PATH,
): boolean {
  const current = loadPairScheduleFile(path)
  if (!hasMeaningfulDiff(current, next)) return false
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
  return true
}

// ---------------------------------------------------------------------------
// 実行（ファイルIO付き・cron 共通エントリ）
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** 生成時刻（ISO 8601）。既定: 現在時刻 */
  now?: string
  /** スクレイパ依存（テスト時に注入） */
  deps?: Partial<PairScrapeDeps>
  /** ログ出力（既定: console.log） */
  log?: (msg: string) => void
}

export interface RunResult {
  /** 生成物 */
  file: PairScheduleFile
  /** 差分ゲートを通過し書き出したか（差分なしは false） */
  written: boolean
}

/**
 * 定期更新の共通エントリ（ファイルIO付き）。
 *
 * 現行 `pair-schedule.json`（前回データ）を読み込み、スクレイプ結果を非破壊マージして
 * 差分ゲートを通す。実体差分がある場合のみ書き出す。スクレイプ失敗時は例外が伝播し、
 * 書き込み段に進まないため既存データを破壊しない。
 */
export async function runPairScheduleToFile(options: RunOptions = {}): Promise<RunResult> {
  const log = options.log ?? ((msg: string) => console.log(msg))
  const now = options.now ?? new Date().toISOString()

  const current = loadPairScheduleFile()
  const prev = current?.months ?? []
  log(`[pair] 開始: 前回 ${prev.length}ヶ月分`)

  const scraped = await scrapePairSchedule({ fetchedAt: now, log, ...options.deps })
  const months = mergePairSchedule(prev, scraped)

  const file: PairScheduleFile = { updatedAt: now, months }
  const written = writePairScheduleFileIfChanged(file)
  log(written ? '[pair] pair-schedule.json を更新しました' : '[pair] 実体差分なし: 据え置き')

  return { file, written }
}

// ---------------------------------------------------------------------------
// CLI エントリ
// ---------------------------------------------------------------------------

/** このモジュールが直接実行されたか（テスト import 時は main を起動しない） */
function isMainModule(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  return import.meta.url === `file://${entry}` || import.meta.url.endsWith(entry)
}

if (isMainModule()) {
  runPairScheduleToFile().catch((err) => {
    console.error('[pair] 失敗:', err)
    process.exitCode = 1
  })
}
