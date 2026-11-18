import type { GameTitle, Provenance, StoreAttributeKey, TernaryState } from '@/types/store'
import type { OverrideEntry } from '@/types/overrides'

/**
 * 管理GUI（/admin/overrides）と その API が overrides.json の1エントリを扱うための純関数。
 *
 * 以前は API が知っている一部の項目（台数・閉店・座標など）だけを残して書き戻していたため、
 * GUI から保存すると営業時間・補足・録画台などがファイル全体から消えていた。
 * ここでは「知っている項目は型を確かめ、知らない項目はそのまま残す」形で扱う。
 */

const GAME_TITLES: GameTitle[] = ['jojo-ls', 'gundam-exvs']
const PROVENANCES: Provenance[] = ['official', 'auto-scrape', 'user-report', 'admin']
const TERNARY: TernaryState[] = ['yes', 'no', 'unknown']

const isString = (v: unknown): v is string => typeof v === 'string'
const isNonEmptyString = (v: unknown): v is string => isString(v) && v.trim() !== ''
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'
const isProvenance = (v: unknown): v is Provenance => PROVENANCES.includes(v as Provenance)
const isTernary = (v: unknown): v is TernaryState => TERNARY.includes(v as TernaryState)

/** ゲーム別レコードのうち、値の型が合うゲームだけを残す。空なら undefined。 */
function byGame<T>(raw: unknown, ok: (v: unknown) => v is T): Partial<Record<GameTitle, T>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Partial<Record<GameTitle, T>> = {}
  for (const game of GAME_TITLES) {
    const v = (raw as Record<string, unknown>)[game]
    if (ok(v)) out[game] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** 属性キー → provenance のレコードのうち、値が provenance のものだけを残す。 */
function provenanceRecord(raw: unknown): Partial<Record<StoreAttributeKey, Provenance>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, Provenance> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isProvenance(v)) out[k] = v
  }
  return Object.keys(out).length > 0 ? (out as Partial<Record<StoreAttributeKey, Provenance>>) : undefined
}

/** 知っている項目ごとの検証。型が合わなければ undefined を返し、その項目を落とす。 */
const FIELD_SANITIZERS: Record<string, (v: unknown) => unknown> = {
  attributeSources: provenanceRecord,
  countSources: (v) => byGame(v, isProvenance),
  note: (v) => (isNonEmptyString(v) ? v : undefined),
  remarks: (v) => (isNonEmptyString(v) ? v : undefined),
  updatedAt: (v) => (isNonEmptyString(v) ? v : undefined),
  machineCounts: (v) => byGame(v, isFiniteNumber),
  countBaselines: (v) => byGame(v, isFiniteNumber),
  closed: (v) => (isBoolean(v) ? v : undefined),
  delisted: (v) => (isBoolean(v) ? v : undefined),
  name: (v) => (isNonEmptyString(v) ? v : undefined),
  address: (v) => (isNonEmptyString(v) ? v : undefined),
  lat: (v) => (isFiniteNumber(v) ? v : undefined),
  lng: (v) => (isFiniteNumber(v) ? v : undefined),
  businessHours: (v) => (isNonEmptyString(v) ? v : undefined),
  floor: (v) => (isNonEmptyString(v) ? v : undefined),
  floorByGame: (v) => byGame(v, isNonEmptyString),
  smoking: (v) => (isTernary(v) ? v : undefined),
  payments: (v) => (Array.isArray(v) && v.every(isString) ? v : undefined),
  hasRecordingByGame: (v) => byGame(v, isTernary),
  hasStreamingByGame: (v) => byGame(v, isTernary),
  officialUrl: (v) => (isNonEmptyString(v) ? v : undefined),
}

/**
 * 1エントリを検証して返す。`source` が正しくなければ null。
 * 知っている項目は型が合わなければ落とし、知らない項目はそのまま残す。キーの順序は入力のまま。
 */
export function sanitizeOverrideEntry(raw: unknown): OverrideEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (!isProvenance(r.source)) return null

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(r)) {
    if (key === 'source') {
      out.source = value
      continue
    }
    const sanitize = FIELD_SANITIZERS[key]
    const next = sanitize ? sanitize(value) : value
    if (next !== undefined) out[key] = next
  }
  return out as unknown as OverrideEntry
}

/**
 * 管理GUIのフォームが扱う項目。フォームで保存するとき、これらはフォームの値で置き換える
 * （フォームで空にした項目は消える）。`countSources` は台数の出どころなので、フォームの
 * 出どころ（`source`）で台数を保存し直すときに一緒に外す。
 */
const FORM_KEYS = [
  'source',
  'note',
  'remarks',
  'machineCounts',
  'countSources',
  'closed',
  'delisted',
  'name',
  'address',
  'lat',
  'lng',
] as const

/** 属性値 → その出どころを記録する attributeSources のキー（GUI のフォームが扱わない属性）。 */
const ATTRIBUTE_SOURCE_KEYS: [keyof OverrideEntry, StoreAttributeKey][] = [
  ['businessHours', 'businessHours'],
  ['floor', 'floor'],
  ['floorByGame', 'floor'],
  ['smoking', 'smoking'],
  ['payments', 'payments'],
  ['hasRecordingByGame', 'hasRecordingByGame'],
  ['hasStreamingByGame', 'hasStreamingByGame'],
  ['officialUrl', 'officialUrl'],
]

/**
 * 既存エントリにフォームの内容を重ねる。フォームが扱う項目（{@link FORM_KEYS}）だけを
 * 置き換え、営業時間・録画台・基準値などフォームに無い項目は既存のまま残す。
 *
 * フォームで既定の出どころ（`source`）を変えたとき、フォームに無い属性の出どころが
 * 一緒に変わらないよう、`attributeSources` に元の出どころを書き残す
 * （未確認の営業時間が、台数の確認のついでに「確定」に変わるのを防ぐ）。
 *
 * メモ（`note`）がフォームで空なら店名を入れる（従来の GUI と同じ）。
 */
export function mergeFormEntry(
  existing: OverrideEntry | undefined,
  formEntry: OverrideEntry,
  defaultNote: string,
): OverrideEntry {
  const form: OverrideEntry = { ...formEntry, note: formEntry.note ?? defaultNote }
  const formKeys = new Set<string>(FORM_KEYS)
  const out: Record<string, unknown> = {}

  const src = (existing ?? {}) as Record<string, unknown>
  const formRec = form as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(src)) {
    if (formKeys.has(key)) {
      if (formRec[key] !== undefined) out[key] = formRec[key]
    } else {
      out[key] = value
    }
  }
  for (const [key, value] of Object.entries(formRec)) {
    if (!(key in out) && value !== undefined) out[key] = value
  }

  if (existing && existing.source !== form.source) {
    const attributeSources: Partial<Record<StoreAttributeKey, Provenance>> = { ...existing.attributeSources }
    for (const [field, key] of ATTRIBUTE_SOURCE_KEYS) {
      if (existing[field] !== undefined && attributeSources[key] === undefined) {
        attributeSources[key] = existing.source
      }
    }
    if (Object.keys(attributeSources).length > 0) out.attributeSources = attributeSources
  }

  return out as unknown as OverrideEntry
}

/** 出どころ・メモ・更新日・基準値など、それだけでは上書きにならない項目。 */
const META_KEYS = new Set(['source', 'note', 'updatedAt', 'attributeSources', 'countSources', 'countBaselines'])

/** 地図の表示を実際に変える項目を1つ以上持つか（空のエントリを保存しないための判定）。 */
export function hasOverrideContent(entry: OverrideEntry): boolean {
  return Object.keys(entry).some((key) => !META_KEYS.has(key))
}
