import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { OverridesFile, OverrideEntry } from '@/types/overrides'
import type { GameTitle, Provenance } from '@/types/store'

/**
 * 手動オーバーライド（src/data/overrides.json）の読み書きAPI。
 *
 * - localhost の管理GUI（/admin/overrides）専用。本番では 404 を返す。
 * - 書き込みは dev サーバの Node 実行を前提（Vercel 本番のFSは書込不可なので無効化）。
 */

export const dynamic = 'force-dynamic'

const OVERRIDES_PATH = path.join(process.cwd(), 'src', 'data', 'overrides.json')
const PROVENANCES: Provenance[] = ['official', 'auto-scrape', 'user-report', 'admin']
const GAME_TITLES: GameTitle[] = ['jojo-ls', 'gundam-exvs']

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

  // 内容が変わった（or 新規）エントリにだけ更新日時を打つ。無変更は既存の updatedAt を保持。
  const current = await readOverrides()
  const stamped = stampUpdatedAt(file, current, new Date().toISOString())

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
    return validateFile(JSON.parse(raw)) ?? { overrides: {} }
  } catch {
    return { overrides: {} }
  }
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
    const entry = validateEntry(entryRaw)
    if (!entry) return null
    overrides[id] = entry
  }
  return { overrides }
}

function validateEntry(raw: unknown): OverrideEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!PROVENANCES.includes(r.source as Provenance)) return null

  const entry: OverrideEntry = { source: r.source as Provenance }

  if (typeof r.note === 'string' && r.note.trim()) entry.note = r.note
  if (typeof r.updatedAt === 'string' && r.updatedAt.trim()) entry.updatedAt = r.updatedAt

  if (r.machineCounts && typeof r.machineCounts === 'object') {
    const counts: Partial<Record<GameTitle, number>> = {}
    for (const game of GAME_TITLES) {
      const v = (r.machineCounts as Record<string, unknown>)[game]
      if (typeof v === 'number' && Number.isFinite(v)) counts[game] = v
    }
    if (Object.keys(counts).length > 0) entry.machineCounts = counts
  }

  if (typeof r.closed === 'boolean') entry.closed = r.closed
  if (typeof r.delisted === 'boolean') entry.delisted = r.delisted
  if (typeof r.name === 'string' && r.name.trim()) entry.name = r.name
  if (typeof r.address === 'string' && r.address.trim()) entry.address = r.address
  if (typeof r.lat === 'number' && Number.isFinite(r.lat)) entry.lat = r.lat
  if (typeof r.lng === 'number' && Number.isFinite(r.lng)) entry.lng = r.lng

  return entry
}
