import type { Store } from '@/types/store'
import type { StoresFile, StoresMeta } from '@/types/stores-file'
import { DEFAULT_DATA_SOURCE } from '@/lib/info-display'
import { scrapeStores, type ScrapeDeps } from './scrape'
import { mergeStores, prefectureToArea } from './merge'
import {
  geocodeStores,
  loadCache,
  saveCache,
  type GeocodeCache,
  type GeocoderDeps,
} from './geocode'
import {
  generateStoresFile,
  loadStoresFile,
  writeStoresFileIfChanged,
} from './generate'

/**
 * パイプライン結合と初回データ生成（Req2.4, 3.1, 3.2, 5.1）。
 *
 * スクレイプ→マージ→ジオコード→生成の各段を1本の処理として連結する。各段の外部I/O
 * （HTML取得・Geocoding API・ファイルIO）は依存注入で差し替え可能にし、固定フィクスチャ
 * からの結合検証を可能にする。
 *
 * `runPipeline` は副作用を持たない純連結（外部I/Oは注入された依存に委ねる）で、
 * 生成物 {@link StoresFile} と追記後のキャッシュ・取得成功エリア集合等を返す。
 * 実ファイルへの書き出し・差分ゲート・キャッシュ永続化は {@link runPipelineToFiles}（CLI）が担う。
 */

// ---------------------------------------------------------------------------
// 純連結（テスト可能）
// ---------------------------------------------------------------------------

export interface PipelineDeps {
  /** スクレイパへの依存（フェッチャ・対象エリア・サイト・前回件数等） */
  scrape?: ScrapeDeps
  /** 前回 `stores.json` の店舗（移設判定・座標/closed の引き継ぎ基準）。既定: 空 */
  prev?: Store[]
  /** ジオコーダへの依存（キャッシュ・ジオコード関数・APIキー等） */
  geocode?: GeocoderDeps
  /** データ出典URL（生成メタ・Req5.1） */
  source: StoresMeta['source']
  /** 最終更新日時として埋め込む生成時刻（ISO 8601・呼び出し側が注入） */
  now: string
}

export interface PipelineResult {
  /** 生成物 {@link StoresFile}（メタ情報＋座標付き店舗） */
  file: StoresFile
  /** 追記後のジオコードキャッシュ（書き戻し対象） */
  cache: GeocodeCache
  /** 今回正常取得できた地域コードの集合 */
  scrapedAreas: Set<string>
  /** 今回新規にジオコードした件数 */
  geocodedCount: number
  /** ジオコード失敗でスキップした店舗ID */
  skipped: string[]
}

/**
 * スクレイプ→マージ→ジオコード→生成を連結する（Req2.4, 3.1, 3.2, 5.1）。
 *
 * 1. {@link scrapeStores}: 公式一覧を取得し、取得成功エリア集合 `scrapedAreas` を得る。
 * 2. {@link mergeStores}: 両サイトを正規化住所でマージし games 合成・移設判定・ID採番。
 * 3. {@link geocodeStores}: 未キャッシュ住所のみ座標補完し、キャッシュへ追記。
 * 4. {@link generateStoresFile}: 必須フィールドを検証し、メタ情報付き生成物へ組み立て。
 *
 * 全体異常（全国総数の急減等）はスクレイパが例外で中断し、本関数も伝播する（Req2.6）。
 */
export async function runPipeline(deps: PipelineDeps): Promise<PipelineResult> {
  const { stores: raw, scrapedAreas } = await scrapeStores(deps.scrape)

  const merged = mergeStores({
    raw,
    prev: deps.prev ?? [],
    scrapedAreas,
  })

  const { stores: geocoded, cache, geocodedCount, skipped } = await geocodeStores(
    merged,
    deps.geocode,
  )

  const file = generateStoresFile({
    stores: geocoded,
    source: deps.source,
    now: deps.now,
  })

  return { file, cache, scrapedAreas, geocodedCount, skipped }
}

/**
 * 前回 `stores.json` から、スクレイプ急減ガード（Req2.6）の比較基準を組み立てる。
 *
 * スクレイパの全国総数・area別件数は「サイトごとの生掲載数」（両対応店は2サイト分=2件）で
 * 数えるため、前回店舗も `games.length` で重み付けして同じ尺度に揃える。
 * 公式一覧から既に消えている店舗（`delisted`）や手動閉店（`closed`）は今回も掲載されない
 * 想定なので基準から除外し、ガードが正規の更新を誤って中断しない保守的な下限とする。
 */
export function computePrevBaseline(prev: Store[]): {
  prevAreaCounts: Map<string, number>
  prevTotal: number
} {
  const prevAreaCounts = new Map<string, number>()
  let prevTotal = 0
  for (const p of prev) {
    if (p.closed || p.delisted) continue
    const area = prefectureToArea(p.address)
    if (area === null) continue
    const weight = p.games.length
    prevAreaCounts.set(area, (prevAreaCounts.get(area) ?? 0) + weight)
    prevTotal += weight
  }
  return { prevAreaCounts, prevTotal }
}

// ---------------------------------------------------------------------------
// 実行（ファイルIO付き・初回データ生成 / cron 共通エントリ）
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** 生成時刻（ISO 8601）。既定: 現在時刻 */
  now?: string
  /** データ出典URL。既定: {@link DEFAULT_DATA_SOURCE} */
  source?: StoresMeta['source']
  /** ログ出力（既定: console.log） */
  log?: (msg: string) => void
}

export interface RunFilesResult extends PipelineResult {
  /** 差分ゲートを通過し `stores.json` を書き出したか（差分なしは false） */
  written: boolean
}

/**
 * 初回データ生成・定期更新の共通エントリ（ファイルIO付き）。
 *
 * 現行 `stores.json`（前回データ）と永続キャッシュを読み込み、{@link runPipeline} を実行する。
 * 生成物は差分ゲート（{@link writeStoresFileIfChanged}）を通して実体差分がある場合のみ書き出し、
 * ジオコードキャッシュは新規結果を含めて常に書き戻す（次回以降の再問い合わせ回避・Req2.3）。
 *
 * 初回はパイプラインを手動実行して全件をジオコードしキャッシュを構築し、手書き静的データから
 * 生成 `stores.json` への一度きりの切替を行う（Req3.1）。実フェッチ・実 Geocoding API は
 * 既定依存（環境変数 `GOOGLE_GEOCODING_API_KEY`）で実行される。
 */
export async function runPipelineToFiles(options: RunOptions = {}): Promise<RunFilesResult> {
  const log = options.log ?? ((msg: string) => console.log(msg))
  const now = options.now ?? new Date().toISOString()
  const source = options.source ?? DEFAULT_DATA_SOURCE

  const current = loadStoresFile()
  const prev = current?.stores ?? []
  const cache = loadCache()

  log(`[pipeline] 開始: 前回店舗=${prev.length}件, キャッシュ=${Object.keys(cache).length}件`)

  // 前回データを急減ガード（Req2.6）の比較基準として注入する。これが無いと
  // scrape.ts の area別/全国総数バリデーションが基準なし扱いで素通りし、公式サイトの
  // HTML 構造変化で取得が激減しても中断されず、痩せ細った stores.json を上書きしてしまう。
  const { prevAreaCounts, prevTotal } = computePrevBaseline(prev)

  const result = await runPipeline({
    prev,
    scrape: { prevAreaCounts, prevTotal },
    geocode: { cache },
    source,
    now,
  })

  log(
    `[pipeline] 生成: 店舗=${result.file.stores.length}件, ` +
      `新規ジオコード=${result.geocodedCount}件, スキップ=${result.skipped.length}件, ` +
      `取得成功エリア=${result.scrapedAreas.size}`,
  )

  // 新規ジオコード結果は差分有無に関わらず常にキャッシュへ永続化する
  saveCache(result.cache)

  const written = writeStoresFileIfChanged(result.file)
  log(written ? '[pipeline] stores.json を更新しました' : '[pipeline] 実体差分なし: stores.json は据え置き')

  return { ...result, written }
}

// ---------------------------------------------------------------------------
// CLI エントリ
// ---------------------------------------------------------------------------

/** このモジュールが直接実行されたか（テスト import 時は main を起動しない） */
function isMainModule(): boolean {
  const entry = process.argv[1]
  // argv[1] が無い実行コンテキスト（worker/REPL 等）では、`endsWith('')` が常に真と
  // なって import だけで実スクレイプ・実ジオコードが走るのを防ぐため、未確定なら false。
  if (!entry) return false
  return import.meta.url === `file://${entry}` || import.meta.url.endsWith(entry)
}

if (isMainModule()) {
  runPipelineToFiles().catch((err) => {
    console.error('[pipeline] 失敗:', err)
    process.exitCode = 1
  })
}
