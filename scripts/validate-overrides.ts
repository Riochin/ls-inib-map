import storesFile from '@/data/stores.json'
import overridesFile from '@/data/overrides.json'
import { applyOverrides } from '@/lib/apply-overrides'
import { listMissingCountBaselines, listStaleCountOverrides } from '@/lib/count-baseline'
import type { Store } from '@/types/store'
import type { OverridesFile } from '@/types/overrides'

/**
 * overrides.json の決定論的な検証ゲート。
 *
 * ユーザー報告の自動反映ワークフロー（reflect-user-reports.yml）で、Claude が編集した
 * 直後に走らせて壊れた override を本番 PR に出さないための安全装置。人が手元で
 * `pnpm exec tsx scripts/validate-overrides.ts` を叩いても同じ検証ができる。
 *
 * 検証内容:
 *  1. JSON としてパースでき、`overrides` がオブジェクトであること（import 時点で保証）
 *  2. 全エントリに `source` があること
 *  3. `applyOverrides` を通したとき、どの店舗にも一致しない override ID が無いこと
 *     （ID不一致＝陳腐化 or 未登録店への誤反映。applyOverrides が console.warn する）
 *  4. 台数の上書きに基準値（countBaselines・ADR-0009）があること。無ければ書き込み経路の入れ忘れ
 *     （`pnpm exec tsx scripts/sync-count-baselines.ts` で埋める）。公式の台数が変わって
 *     使われなくなった上書きは異常ではないので、失敗にせず件数だけ出す
 *
 * 問題があれば一覧を出して exit 1。CI のこのステップが失敗すれば後続の PR 作成へ進まない。
 */
function main(): void {
  const stores = (storesFile as unknown as { stores: Store[] }).stores
  const file = overridesFile as OverridesFile
  const entries = Object.entries(file.overrides ?? {})

  const problems: string[] = []

  // 2. source 必須
  for (const [id, entry] of entries) {
    if (!entry?.source) problems.push(`override "${id}" に source がありません`)
  }

  // 3. applyOverrides の console.warn（ID不一致）を捕捉
  const warnings: string[] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((a) => String(a)).join(' '))
  }
  let result: Store[] = []
  try {
    result = applyOverrides(stores, file)
  } finally {
    console.warn = origWarn
  }
  for (const w of warnings) problems.push(`ID不一致: ${w}`)

  // 4. 台数の上書きの基準値
  for (const { id, game } of listMissingCountBaselines(file)) {
    problems.push(
      `override "${id}" の ${game} の台数に基準値（countBaselines）がありません` +
        '（pnpm exec tsx scripts/sync-count-baselines.ts で埋める）',
    )
  }
  const staleCount = listStaleCountOverrides(stores, file).length

  if (problems.length > 0) {
    console.error(`❌ overrides.json 検証失敗（${problems.length}件）:`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }

  const remarksCount = result.filter((s) => s.remarks).length
  console.log(
    `✅ overrides.json OK（${entries.length}エントリ / remarks ${remarksCount}店舗 / ID不一致なし）`,
  )
  if (staleCount > 0) {
    console.log(`ℹ️ 公式の台数が変わったため使われていない台数の上書き: ${staleCount}件`)
  }
}

main()
