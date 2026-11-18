import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { syncCountBaselines } from '@/lib/count-baseline'
import type { Store } from '@/types/store'
import type { OverridesFile } from '@/types/overrides'

/**
 * overrides.json の台数の上書きに基準値（上書きした時点の公式台数・ADR-0009）を入れる。
 *
 * 使い方:
 *   pnpm exec tsx scripts/sync-count-baselines.ts                     基準値が無いものだけ埋める
 *   pnpm exec tsx scripts/sync-count-baselines.ts --base <file>       <file> から台数が変わったものも今の公式値にする
 *   pnpm exec tsx scripts/sync-count-baselines.ts --confirm <id,...>  見直した店の基準値を今の公式値にする
 *
 * 公式の台数は上書き前の `src/data/stores.json` から読む。`updatedAt` は変えない。
 * ユーザー報告の自動反映（reflect-user-reports.yml）では、Claude の編集のあとに
 * `--base`（編集前のファイル）つきで回す。基準値は人にも Claude にも手で書かせない。
 */

const ROOT = process.cwd()
const STORES_PATH = path.join(ROOT, 'src', 'data', 'stores.json')
const OVERRIDES_PATH = path.join(ROOT, 'src', 'data', 'overrides.json')

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

/**
 * 2スペース・末尾改行で書き出す。店舗の並び順は変えない（基準値の追加だけが diff に出るように）。
 */
function writeOverrides(file: OverridesFile): void {
  writeFileSync(OVERRIDES_PATH, JSON.stringify(file, null, 2) + '\n', 'utf-8')
}

function parseArgs(argv: string[]): { base?: string; confirmIds: string[] } {
  const out: { base?: string; confirmIds: string[] } = { confirmIds: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--base') out.base = argv[++i]
    else if (arg === '--confirm') out.confirmIds.push(...(argv[++i] ?? '').split(',').filter(Boolean))
    else throw new Error(`不明な引数です: ${arg}`)
  }
  if (out.base === undefined && argv.includes('--base')) throw new Error('--base にはファイルを指定してください')
  return out
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const stores = readJson<{ stores: Store[] }>(STORES_PATH).stores
  const file = readJson<OverridesFile>(OVERRIDES_PATH)
  const base = args.base ? readJson<OverridesFile>(args.base) : undefined

  const known = new Set(Object.keys(file.overrides))
  const unknown = args.confirmIds.filter((id) => !known.has(id))
  if (unknown.length > 0) throw new Error(`overrides.json に無い店舗IDです: ${unknown.join(', ')}`)

  const result = syncCountBaselines(file, stores, { base, confirmIds: args.confirmIds })
  if (result.changedIds.length === 0) {
    console.log('台数の基準値: 変更なし')
    return
  }
  writeOverrides(result.file)
  console.log(`台数の基準値を更新しました（${result.changedIds.length}店）`)
}

main()
