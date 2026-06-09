import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ペア戦開催日程の定期更新ワークフローの契約テスト。
 *
 * `.github/workflows/update-pair-schedule.yml` が、設計で固定した契約を満たすことを
 * 専用YAMLパーサ依存を増やさずテキスト検査で検証する。
 *
 * 契約:
 * - 毎週木曜 09:00 JST（= 00:00 UTC, cron `0 0 * * 4`）＋手動起動で起動する。
 * - pnpm でセットアップ・インストールし、`scripts/scrape-pair-schedule.ts` を実行する。
 * - 実体差分（`pair-schedule.json`）がある場合のみコミット・プッシュする。
 * - コミットメッセージは既存規約（`chore:` + 日本語要約）、push 権限（`contents: write`）を持つ。
 */

const WORKFLOW_PATH = resolve(__dirname, '../../.github/workflows/update-pair-schedule.yml')

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, 'utf-8')
}

describe('update-pair-schedule ワークフロー', () => {
  it('ワークフローファイルが存在する', () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true)
  })

  it('毎週木曜 00:00 UTC（09:00 JST）の cron スケジュールで起動する', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/schedule:/)
    expect(yml).toMatch(/cron:\s*['"]0 0 \* \* 4['"]/)
  })

  it('手動起動（workflow_dispatch）が可能である', () => {
    expect(readWorkflow()).toMatch(/workflow_dispatch:/)
  })

  it('pnpm でセットアップ・インストールする', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/pnpm\/action-setup/)
    expect(yml).toMatch(/pnpm install --frozen-lockfile/)
  })

  it('スクレイパ（scripts/scrape-pair-schedule.ts）を実行する', () => {
    expect(readWorkflow()).toMatch(/pnpm exec tsx scripts\/scrape-pair-schedule\.ts/)
  })

  it('差分検知に pair-schedule.json を含める', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/src\/data\/pair-schedule\.json/)
    expect(yml).toMatch(/git status --porcelain/)
  })

  it('既存規約に従うコミットメッセージ（chore: + 日本語要約）でコミットする', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/git commit -m ["']chore: .+["']/)
    expect(yml).toMatch(/git push/)
  })

  it('push のための contents: write 権限を持つ', () => {
    expect(readWorkflow()).toMatch(/contents:\s*write/)
  })
})

/**
 * 既存の店舗データ更新ワークフローも pnpm へ移行済みであることを確認する
 * （リポジトリ全体の pnpm 統一）。
 */
describe('update-stores ワークフロー（pnpm 移行）', () => {
  const STORES_PATH = resolve(__dirname, '../../.github/workflows/update-stores.yml')
  const read = () => readFileSync(STORES_PATH, 'utf-8')

  it('pnpm でインストールする（npm ci を使わない）', () => {
    const yml = read()
    expect(yml).toMatch(/pnpm\/action-setup/)
    expect(yml).toMatch(/pnpm install --frozen-lockfile/)
    expect(yml).not.toMatch(/npm ci/)
  })

  it('パイプラインを pnpm exec tsx で実行する', () => {
    expect(read()).toMatch(/pnpm exec tsx scripts\/pipeline\.ts/)
  })
})
