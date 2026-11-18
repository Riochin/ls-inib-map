import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { OverridesFile, OverrideEntry } from '@/types/overrides'
import type { Store } from '@/types/store'
import { sanitizeOverrideEntry } from '@/lib/override-entry'
import { syncCountBaselines } from '@/lib/count-baseline'

/**
 * 手動オーバーライド（src/data/overrides.json）の読み書きAPI。
 *
 * - localhost の管理GUI（/admin/overrides）専用。本番では 404 を返す。
 * - 書き込みは dev サーバの Node 実行を前提（Vercel 本番のFSは書込不可なので無効化）。
 * - 保存時に台数の上書きの基準値（ADR-0009）を入れる。台数を変えた・足したゲームと、
 *   本文の `confirmIds`（「この台数で確認した」）の店は、今の公式台数を基準にし直す。
 */

export const dynamic = 'force-dynamic'

const OVERRIDES_PATH = path.join(process.cwd(), 'src', 'data', 'overrides.json')
// 上書き前の公式データ（@/data/stores は上書き適用済みなので基準値には使えない）
const STORES_PATH = path.join(process.cwd(), 'src', 'data', 'stores.json')

/** 本番では利用不可。ガードに引っかかれば 404 レスポンスを返す。 */
function blockInProduction(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  return null
}

export async function GET() {
  const blocked = blockInProduction()
  if (blocked) return blocked
  return NextResponse.json(await readOverrides())
}

export async function POST(request: Request) {
  const blocked = blockInProduction()
  if (blocked) return blocked

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const file = validateFile(body)
  if (!file) {
    return NextResponse.json({ error: 'Invalid overrides payload' }, { status: 400 })
  }

  const confirmIds = readConfirmIds(body)
  if (!confirmIds) {
    return NextResponse.json({ error: 'Invalid confirmIds' }, { status: 400 })
  }

  // 台数を変えた・足したゲームと「この台数で確認した」店に、今の公式台数を基準値として入れる
  const current = await readOverrides()
  const { file: synced } = syncCountBaselines(file, await readOfficialStores(), {
    base: current,
    confirmIds,
  })

  // 内容が変わった（or 新規）エントリにだけ更新日時を打つ。無変更は既存の updatedAt を保持。
  const stamped = stampUpdatedAt(synced, current, new Date().toISOString())

  await writeOverrides(stamped)
  return NextResponse.json({ ok: true, file: stamped })
}

/** updatedAt を除いたエントリ内容が等しいか（正規化済み前提でキー順は決定論的）。 */
function entryContentEqual(a: OverrideEntry, b: OverrideEntry): boolean {
  const strip = ({ updatedAt: _omit, ...rest }: OverrideEntry) => rest
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}

/** 変更/新規エントリへ now を打ち、無変更は現行の updatedAt を維持した新ファイルを返す。 */
function stampUpdatedAt(next: OverridesFile, current: OverridesFile, now: string): OverridesFile {
  const overrides: Record<string, OverrideEntry> = {}
  for (const [id, entry] of Object.entries(next.overrides)) {
    const cur = current.overrides[id]
    const unchanged = cur != null && entryContentEqual(cur, entry)
    const updatedAt = unchanged ? cur.updatedAt : now
    overrides[id] = updatedAt ? { ...entry, updatedAt } : entry
  }
  return { overrides }
}

async function readOverrides(): Promise<OverridesFile> {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { overrides: {} }
    const overridesRaw = (parsed as Record<string, unknown>).overrides
    if (!overridesRaw || typeof overridesRaw !== 'object') return { overrides: {} }
    // 1件の不正エントリでファイル全体を破棄しないよう、個別にスキップする
    const overrides: Record<string, OverrideEntry> = {}
    for (const [id, entryRaw] of Object.entries(overridesRaw as Record<string, unknown>)) {
      const entry = sanitizeOverrideEntry(entryRaw)
      if (entry) overrides[id] = entry
    }
    return { overrides }
  } catch {
    return { overrides: {} }
  }
}

/** 本文の `confirmIds`（任意・店舗IDの配列）。形が不正なら null。 */
function readConfirmIds(body: unknown): string[] | null {
  const raw = (body as Record<string, unknown>).confirmIds
  if (raw === undefined) return []
  if (!Array.isArray(raw) || !raw.every((id) => typeof id === 'string')) return null
  return raw
}

async function readOfficialStores(): Promise<Store[]> {
  const raw = await fs.readFile(STORES_PATH, 'utf-8')
  return (JSON.parse(raw) as { stores: Store[] }).stores
}

async function writeOverrides(file: OverridesFile): Promise<void> {
  await fs.writeFile(OVERRIDES_PATH, JSON.stringify(sortFile(file), null, 2) + '\n', 'utf-8')
}

/** 店舗IDキーを昇順整形して diff を安定させる。 */
function sortFile(file: OverridesFile): OverridesFile {
  const overrides: Record<string, OverrideEntry> = {}
  for (const id of Object.keys(file.overrides).sort()) {
    overrides[id] = file.overrides[id]
  }
  return { overrides }
}

function validateFile(body: unknown): OverridesFile | null {
  if (!body || typeof body !== 'object') return null
  const overridesRaw = (body as Record<string, unknown>).overrides
  if (!overridesRaw || typeof overridesRaw !== 'object') return null

  const overrides: Record<string, OverrideEntry> = {}
  for (const [id, entryRaw] of Object.entries(overridesRaw as Record<string, unknown>)) {
    const entry = sanitizeOverrideEntry(entryRaw)
    if (!entry) return null
    overrides[id] = entry
  }
  return { overrides }
}
