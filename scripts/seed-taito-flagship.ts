/**
 * 【一度だけ走らせる発見ツール】タイトー本体「タイトーステーション」旗艦店の
 * 公式店舗ページID（/store/{id}）を収集し、chain-url-map.json の taitoFlagshipSeed に投入する。
 *
 * 旗艦店は公開一覧APIに存在しないため、plausible な /store/{id} 数値レンジを走査し、
 * 各ページの JSON-LD 住所を我々の店舗住所と正規化照合して storeId↔URL を確定する。
 * これは月次CIには含めない（CIはシード済みURLを叩くだけ）。収集後はシードが永続する。
 *
 * 実行例:
 *   pnpm exec tsx scripts/seed-taito-flagship.ts 2040 2230
 *   pnpm exec tsx scripts/seed-taito-flagship.ts 2040 2230 --delay 4000
 *
 * 引数: <startNum> <endNum> [--delay ms] [--prefix 0000]
 *   /store/{prefix}{zero-padded num} を start..end で走査する。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as url from 'node:url'
import { normalizeAddress } from './merge.js'
import { extractJsonLd, findBusinessNode } from './parse-json-ld.js'

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const STORES_JSON_PATH = path.join(ROOT, 'src/data/stores.json')
const CHAIN_URL_MAP_PATH = path.join(ROOT, 'scripts/cache/chain-url-map.json')
const UA = 'ls-exvs-map/seed (+https://github.com/rioj7927/ls-exvs-map; Issue#107 one-time)'

interface OurStore {
  id: string
  name: string
  address: string
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchHtml(target: string): Promise<string | null> {
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

interface JsonLdAddress {
  addressRegion?: string
  addressLocality?: string
  streetAddress?: string
}

function buildAddress(a: JsonLdAddress | undefined): string {
  if (!a) return ''
  return `${a.addressRegion ?? ''}${a.addressLocality ?? ''}${a.streetAddress ?? ''}`.trim()
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const positional = args.filter((a) => !a.startsWith('--'))
  const startNum = Number.parseInt(positional[0] ?? '2040', 10)
  const endNum = Number.parseInt(positional[1] ?? '2230', 10)
  const delayIdx = args.indexOf('--delay')
  const delayMs = delayIdx >= 0 ? Number.parseInt(args[delayIdx + 1], 10) : 4000
  const prefixIdx = args.indexOf('--prefix')
  const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : '0000'

  const ourStores: OurStore[] = JSON.parse(fs.readFileSync(STORES_JSON_PATH, 'utf8')).stores
  const taito = ourStores.filter((s) => s.name.includes('タイトー'))
  const byAddr = new Map<string, OurStore>()
  for (const s of taito) byAddr.set(normalizeAddress(s.address), s)

  // 既存シードを読み、未収集の storeId のみ対象にする
  const cache = JSON.parse(fs.readFileSync(CHAIN_URL_MAP_PATH, 'utf8'))
  const seed: Record<string, string> = cache.taitoFlagshipSeed ?? {}
  const alreadySeeded = new Set(Object.keys(seed))

  console.log(
    `[seed] 走査レンジ /store/${prefix}${startNum}〜${prefix}${endNum}` +
      `（${endNum - startNum + 1}件・delay=${delayMs}ms）`,
  )
  console.log(`[seed] タイトー店舗 ${taito.length} 件中 未収集 ${taito.length - alreadySeeded.size} 件`)

  let scanned = 0
  let hit = 0
  for (let n = startNum; n <= endNum; n++) {
    const id = `${prefix}${n}`
    const pageUrl = `https://www.taito.co.jp/store/${id}`
    if (scanned > 0 && delayMs > 0) await delay(delayMs)
    scanned++

    const html = await fetchHtml(pageUrl)
    if (!html) {
      process.stdout.write('.')
      continue
    }
    const node = findBusinessNode(extractJsonLd(html))
    const addr = buildAddress(node?.address)
    if (!addr) {
      process.stdout.write('x')
      continue
    }
    const store = byAddr.get(normalizeAddress(addr))
    if (store && !seed[store.id]) {
      seed[store.id] = pageUrl
      hit++
      console.log(`\n[seed] ✓ ${id} → ${store.name}（${node?.name ?? '?'}）`)
    } else {
      process.stdout.write('o') // ページは在るが我々の店舗と不一致 or 既収集
    }
  }

  cache.taitoFlagshipSeed = seed
  fs.writeFileSync(CHAIN_URL_MAP_PATH, JSON.stringify(cache, null, 2) + '\n')
  console.log(
    `\n[seed] 走査 ${scanned} 件・新規ヒット ${hit} 件・シード合計 ${Object.keys(seed).length} 件`,
  )
  console.log('[seed] chain-url-map.json の taitoFlagshipSeed を更新しました')
}

main().catch((err) => {
  console.error('[seed] 失敗:', err)
  process.exitCode = 1
})
