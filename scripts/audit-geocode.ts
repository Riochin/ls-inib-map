/**
 * ジオコード精度の一括監査（一回限りの運用スクリプト）。
 *
 * 既存 `src/data/stores.json` の全店について住所を Google Geocoding へ再問い合わせし、
 * `location_type`/`partial_match` から精度を判定する。目的は2つ:
 *
 * 1. 既に投入済みのピンのうち「おおよそ（要確認）」な店舗を洗い出す（(b) 健康診断）。
 * 2. 取得した精度を永続キャッシュ `scripts/cache/geocode.json` へ焼き込み、`stores.json`
 *    に `approximateLocation` フラグを付与して、(a) の恒久化と地続きにする。
 *
 * ピンは動かさない（lat/lng は既存値を維持し、精度メタのみ付与する）。位置の補正は
 * overrides.json（運営確認）で行う運用。
 *
 * 実行: `npx tsx scripts/audit-geocode.ts`（APIキーは .env.local から自動読込）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  buildGeocodeUrl,
  isApproximateLocation,
  loadCache,
  parseGeocodeResponse,
  saveCache,
  type GeocodeResult,
} from './geocode'
import { normalizeAddress } from './merge'
import type { StoresFile } from '@/types/stores-file'

const STORES_PATH = 'src/data/stores.json'
const AUDIT_REPORT_PATH = 'scripts/cache/geocode-audit.json'
const DELAY_MS = 120

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** .env.local を最小パースして process.env へ流し込む（依存なし・既存値を優先） */
function loadEnvLocal(path = '.env.local'): void {
  let text: string
  try {
    text = readFileSync(path, 'utf-8')
  } catch {
    return
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let val = m[2]
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val
  }
}

interface FlaggedStore {
  id: string
  name: string
  address: string
  precision: string
  partialMatch: boolean
}

async function main(): Promise<void> {
  loadEnvLocal()
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEOCODING_API_KEY が未設定です（.env.local を確認）')

  const file = JSON.parse(readFileSync(STORES_PATH, 'utf-8')) as StoresFile
  const cache = loadCache()
  const total = file.stores.length

  const flagged: FlaggedStore[] = []
  const failed: { id: string; name: string; address: string }[] = []
  let done = 0

  for (const store of file.stores) {
    done++
    let res: GeocodeResult | null = null
    try {
      const r = await fetch(buildGeocodeUrl(store.address, apiKey))
      if (r.ok) res = parseGeocodeResponse(await r.json())
    } catch {
      res = null
    }
    await sleep(DELAY_MS)

    if (!res) {
      failed.push({ id: store.id, name: store.name, address: store.address })
      // 取得失敗は現状フラグを維持（消さない）
      if (done % 50 === 0) console.log(`  ...${done}/${total}`)
      continue
    }

    // 精度をキャッシュへ焼き込み（lat/lng は既存維持＝ピンは動かさない）
    const key = normalizeAddress(store.address)
    if (cache[key]) {
      cache[key].precision = res.precision
      cache[key].partialMatch = res.partialMatch
    }

    if (isApproximateLocation(res)) {
      store.approximateLocation = true
      flagged.push({
        id: store.id,
        name: store.name,
        address: store.address,
        precision: res.precision ?? 'UNKNOWN',
        partialMatch: res.partialMatch === true,
      })
    } else {
      // もはや該当しない場合はフラグを落とす（精度が改善したケース）
      delete store.approximateLocation
    }

    if (done % 50 === 0) console.log(`  ...${done}/${total}`)
  }

  // 書き戻し（lastUpdated は触らない＝精度監査では更新日時を進めない）
  saveCache(cache)
  writeFileSync(STORES_PATH, `${JSON.stringify(file, null, 2)}\n`, 'utf-8')
  writeFileSync(
    AUDIT_REPORT_PATH,
    `${JSON.stringify({ flagged, failed }, null, 2)}\n`,
    'utf-8',
  )

  // サマリー
  console.log('\n========== ジオコード精度 監査結果 ==========')
  console.log(`対象店舗: ${total}`)
  console.log(`要確認（APPROXIMATE / partial_match）: ${flagged.length}`)
  console.log(`再ジオコード失敗（要個別確認）: ${failed.length}`)
  console.log('--------------------------------------------')
  for (const f of flagged) {
    const pm = f.partialMatch ? ' +partial' : ''
    console.log(`  ${f.id}  ${f.name}  | ${f.address}  [${f.precision}${pm}]`)
  }
  if (failed.length > 0) {
    console.log('---- 再ジオコード失敗 ----')
    for (const f of failed) console.log(`  ${f.id}  ${f.name}  | ${f.address}`)
  }
  console.log(`\nレポート: ${AUDIT_REPORT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
