import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 定期実行ワークフロー（Req2.5, 2.6, 2.8）の契約テスト。
 *
 * `.github/workflows/update-stores.yml` が定める CI ワークフローが、設計書で固定した
 * 契約を満たすことを検証する。専用の YAML パーサ依存を増やさず、ワークフローファイルを
 * テキストとして読み、契約上の必須要素を検査する。
 *
 * 契約:
 * - 毎週水曜 09:24 JST（= 00:24 UTC, cron `24 0 * * 3`）で起動する（Req2.5）。
 * - 手動起動（`workflow_dispatch`）も可能である。
 * - ジオコーディングAPIキーをシークレットから環境変数へ渡す（鍵をリポジトリに残さない）。
 * - パイプライン（`scripts/pipeline.ts`）を実行する。スクリプト失敗時はコミット段へ進まない
 *   （差分コミット段はパイプライン段の成功に依存する）。
 * - 実体差分（`stores.json` / ジオコードキャッシュ）がある場合のみ PR を作成し、
 *   差分が無ければ PR を作らない（Req2.7 を create-pull-request の差分検知で担保）。
 * - コミットメッセージは既存規約（`chore:` + 日本語要約）に従う。
 * - main へ直 push せず PR を作成する（無確認で本番デプロイへ出るのを防ぐ）。
 * - PR 作成権限（`contents: write` / `pull-requests: write`）を持ち、ランタイムAPI/DBを
 *   導入しない（ビルド前生成のみ・Req2.8）。
 */

const WORKFLOW_PATH = resolve(__dirname, '../../.github/workflows/update-stores.yml')

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, 'utf-8')
}

describe('update-stores ワークフロー', () => {
  it('ワークフローファイルが存在する', () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true)
  })

  it('毎週水曜 00:24 UTC（09:24 JST）の cron スケジュールで起動する', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/schedule:/)
    // 真夜中UTCぴったり（0 0）は遅延・欠落しやすいため分をずらしている
    expect(yml).toMatch(/cron:\s*['"]24 0 \* \* 3['"]/)
  })

  it('手動起動（workflow_dispatch）が可能である', () => {
    expect(readWorkflow()).toMatch(/workflow_dispatch:/)
  })

  it('ジオコーディングAPIキーをシークレットから環境変数へ渡す', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/GOOGLE_GEOCODING_API_KEY:\s*\$\{\{\s*secrets\.GOOGLE_GEOCODING_API_KEY\s*\}\}/)
  })

  it('パイプライン（scripts/pipeline.ts）を実行する', () => {
    expect(readWorkflow()).toMatch(/scripts\/pipeline\.ts/)
  })

  it('PR の対象パスに stores.json とジオコードキャッシュを含める', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/src\/data\/stores\.json/)
    expect(yml).toMatch(/scripts\/cache\/geocode\.json/)
    // create-pull-request の差分検知で差分有無を判定する（差分なしは PR を作らない・Req2.7）
    expect(yml).toMatch(/peter-evans\/create-pull-request/)
    expect(yml).toMatch(/add-paths:/)
  })

  it('既存規約に従うコミットメッセージ（chore: + 日本語要約）で PR を作成する', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/commit-message:\s*["']chore: .+["']/)
    // main へ直 push はしない（PR を作成する）
    expect(yml).not.toMatch(/git push/)
  })

  it('PR 作成のための contents: write / pull-requests: write 権限を持つ', () => {
    const yml = readWorkflow()
    expect(yml).toMatch(/contents:\s*write/)
    expect(yml).toMatch(/pull-requests:\s*write/)
  })
})
