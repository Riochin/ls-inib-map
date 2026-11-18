import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { listStaleCountOverrides, type StaleCountOverride } from '@/lib/count-baseline'
import { getGameLabel } from '@/lib/marker-color'
import type { Store } from '@/types/store'
import type { OverridesFile } from '@/types/overrides'

/**
 * 公式の台数が基準値から変わったため、使われていない台数の上書きを一覧にする（ADR-0009）。
 *
 * 週次の店舗データ更新（update-stores.yml）で、パイプラインが新しい stores.json を作ったあとに回し、
 * 更新 PR の本文に「マージ後に使われない上書き」として載せる。1件も無ければ何も出さない。
 *
 *   pnpm exec tsx scripts/report-stale-count-overrides.ts
 *
 * `GITHUB_OUTPUT` があれば `stale_count`（件数）と `stale_count_overrides`（Markdown）を書く。
 */

const formatCount = (n: number): string => (n > 0 ? `${n}台` : '台数なし')

/** 一覧を PR 本文用の Markdown にする。0件なら空文字。 */
export function formatStaleCountOverrides(stale: StaleCountOverride[]): string {
  if (stale.length === 0) return ''
  const rows = stale.map(
    (s) =>
      `| ${s.name}（\`${s.id}\`） | ${getGameLabel(s.game)} | ${formatCount(s.baseline)} | ${formatCount(s.official)} | ${s.override}台 |`,
  )
  return [
    `### 公式の台数が変わったため使われない台数の上書き（${stale.length}件）`,
    '',
    'マージ後、次の店は台数の上書きを使わず、公式の台数（未確認）を地図に出します。',
    '見直して上書きの台数が正しければ、管理画面で「この台数で確認した」にチェックして保存するか、',
    '`pnpm exec tsx scripts/sync-count-baselines.ts --confirm <店舗ID>` を回してください。台数が違えば上書きを直してください。',
    '',
    '| 店舗 | ゲーム | 上書きした時点の公式 | 今の公式 | 上書き |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}

/** GitHub Actions のステップ出力へ書く（複数行は区切り文字つき）。`GITHUB_OUTPUT` が無ければ何もしない。 */
export function writeStaleOutput(
  stale: StaleCountOverride[],
  outputPath: string | undefined = process.env.GITHUB_OUTPUT,
): void {
  if (!outputPath) return
  const delimiter = `STALE_COUNT_OVERRIDES_${Date.now()}`
  appendFileSync(
    outputPath,
    `stale_count=${stale.length}\n` +
      `stale_count_overrides<<${delimiter}\n${formatStaleCountOverrides(stale)}\n${delimiter}\n`,
  )
}

function main(): void {
  const root = process.cwd()
  const stores = (
    JSON.parse(readFileSync(path.join(root, 'src', 'data', 'stores.json'), 'utf-8')) as { stores: Store[] }
  ).stores
  const file = JSON.parse(readFileSync(path.join(root, 'src', 'data', 'overrides.json'), 'utf-8')) as OverridesFile

  const stale = listStaleCountOverrides(stores, file)
  console.log(stale.length > 0 ? formatStaleCountOverrides(stale) : '公式の台数が変わった台数の上書き: なし')
  writeStaleOutput(stale)
}

/** このモジュールが直接実行されたか（テスト import 時は main を起動しない） */
function isMainModule(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  return import.meta.url === `file://${entry}` || import.meta.url.endsWith(entry)
}

if (isMainModule()) main()
