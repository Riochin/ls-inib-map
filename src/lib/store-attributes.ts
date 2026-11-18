/**
 * 店舗属性レジストリ（ADR-0005）。
 *
 * 店舗属性の定義の正本。報告の入力型・API 検証・Issue 本文の提案値表・オーバーライド適用・
 * 詳細表示・充実度は、ここに並んだ順と定義から導出する。属性を足すときは、ここに1項目、
 * `Store` と `OverrideEntry` に型1行を足し、フォームの UI を手で書く。
 *
 * - `key`: `Store` / `OverrideEntry` のフィールド名そのもの
 * - `sourceKey`: 出どころ（`attributeSources`）のキー。付随フィールド（台数・内容）や
 *   ゲーム別フロアは本体のキーを共有する
 * - `label`: Issue 本文と詳細モーダルで共通の表示名。過去の Issue と自動反映の指示文が
 *   この文字列に依存するため、既存項目のラベルは変えない
 * - `parent`: 付随フィールドのとき、本体の `key`
 * - `panel`: 詳細モーダルで行を出す枠（無ければ行を出さない）
 * - `completeness`: 充実度の項目グループ名。同じグループの属性はまとめて1項目と数える
 * - `reportable`: 提供フォームから送れるか（API が受け付け、Issue 本文に行を作る）
 * - `collapseSameValue`: ゲーム別の値が全ゲームで同じなら Issue 本文を1行にまとめる
 *
 * このファイルは型の循環を避けるため `Store` 型を import しない（`StoreAttributeKey` が
 * ここから導出されるため）。キーが `Store` / `OverrideEntry` に実在することはテストで検査する。
 */

import type { GameTitle, TernaryState } from '@/types/store'

export const GAME_TITLES: readonly GameTitle[] = ['jojo-ls', 'gundam-exvs']

export type AttributeScope = 'store' | 'game'
export type AttributeKind = 'ternary' | 'text' | 'number' | 'list'
export type AttributePanel = 'facility' | 'service'

export interface AttributeDef {
  readonly key: string
  readonly sourceKey: string
  readonly label: string
  readonly scope: AttributeScope
  readonly kind: AttributeKind
  /** text: 文字数の上限 */
  readonly maxLength?: number
  /** list: 件数の上限 */
  readonly maxItems?: number
  /** list: 要素の文字数の上限 */
  readonly itemMaxLength?: number
  /** number: 下限・上限（整数） */
  readonly min?: number
  readonly max?: number
  readonly parent?: string
  readonly panel?: AttributePanel
  readonly completeness?: string
  readonly reportable: boolean
  readonly collapseSameValue?: boolean
  readonly filterable?: boolean
}

export const STORE_ATTRIBUTES = [
  {
    key: 'businessHours',
    sourceKey: 'businessHours',
    label: '営業時間',
    scope: 'store',
    kind: 'text',
    maxLength: 100,
    panel: 'facility',
    completeness: 'businessHours',
    reportable: true,
  },
  {
    // 店舗単位の共通フロア。提供フォームはゲーム別（floorByGame）で送るため報告対象外
    key: 'floor',
    sourceKey: 'floor',
    label: 'フロア',
    scope: 'store',
    kind: 'text',
    maxLength: 50,
    panel: 'facility',
    completeness: 'floor',
    reportable: false,
  },
  {
    // ゲーム別フロア。詳細モーダルでは共通フロアと合わせて「フロア」行に出す
    key: 'floorByGame',
    sourceKey: 'floor',
    label: 'フロア',
    scope: 'game',
    kind: 'text',
    maxLength: 50,
    completeness: 'floor',
    reportable: true,
    collapseSameValue: true,
  },
  {
    key: 'smoking',
    sourceKey: 'smoking',
    label: '喫煙所',
    scope: 'store',
    kind: 'ternary',
    panel: 'facility',
    completeness: 'smoking',
    reportable: true,
  },
  {
    key: 'payments',
    sourceKey: 'payments',
    label: '決済/電子マネー',
    scope: 'store',
    kind: 'list',
    maxItems: 20,
    itemMaxLength: 30,
    panel: 'facility',
    completeness: 'payments',
    reportable: true,
  },
  {
    key: 'hasRecordingByGame',
    sourceKey: 'hasRecordingByGame',
    label: '録画台',
    scope: 'game',
    kind: 'ternary',
    panel: 'facility',
    completeness: 'machineEquipment',
    reportable: true,
    filterable: true,
  },
  {
    key: 'hasStreamingByGame',
    sourceKey: 'hasStreamingByGame',
    label: '配信台',
    scope: 'game',
    kind: 'ternary',
    panel: 'facility',
    completeness: 'machineEquipment',
    reportable: true,
    filterable: true,
  },
  {
    // 無制限台（ADR-0002）。録画台・配信台と同じゲーム別三値で、「あり」のとき台数を添える
    key: 'hasUnlimitedByGame',
    sourceKey: 'hasUnlimitedByGame',
    label: '無制限台',
    scope: 'game',
    kind: 'ternary',
    panel: 'facility',
    completeness: 'machineEquipment',
    reportable: true,
    filterable: true,
  },
  {
    key: 'unlimitedCountByGame',
    sourceKey: 'hasUnlimitedByGame',
    label: '無制限台 台数',
    scope: 'game',
    kind: 'number',
    min: 1,
    max: 99,
    parent: 'hasUnlimitedByGame',
    reportable: true,
  },
  {
    // 店のサービス（ADR-0003）。有無はゲーム別三値、内容はゲーム別の自由記述。絞り込み・充実度の対象外
    key: 'creditServiceByGame',
    sourceKey: 'creditServiceByGame',
    label: 'クレジットサービス',
    scope: 'game',
    kind: 'ternary',
    panel: 'service',
    reportable: true,
  },
  {
    key: 'creditServiceNoteByGame',
    sourceKey: 'creditServiceByGame',
    label: 'クレジットサービス 内容',
    scope: 'game',
    kind: 'text',
    maxLength: 100,
    parent: 'creditServiceByGame',
    reportable: true,
  },
  {
    key: 'rentalByGame',
    sourceKey: 'rentalByGame',
    label: '貸切',
    scope: 'game',
    kind: 'ternary',
    panel: 'service',
    reportable: true,
  },
  {
    key: 'rentalNoteByGame',
    sourceKey: 'rentalByGame',
    label: '貸切 内容',
    scope: 'game',
    kind: 'text',
    maxLength: 100,
    parent: 'rentalByGame',
    reportable: true,
  },
  {
    // 詳細モーダルではリンクとして出すため行は作らない
    key: 'officialUrl',
    sourceKey: 'officialUrl',
    label: '公式URL',
    scope: 'store',
    kind: 'text',
    completeness: 'officialUrl',
    reportable: false,
  },
] as const satisfies readonly AttributeDef[]

export type StoreAttribute = (typeof STORE_ATTRIBUTES)[number]
/** レジストリに載っているデータのフィールド名 */
export type AttributeDataKey = StoreAttribute['key']
/** 出どころ（attributeSources）のキー */
export type AttributeSourceKey = StoreAttribute['sourceKey']

/** 提供フォームから送れる属性（レジストリ順） */
export const REPORTABLE_ATTRIBUTES: readonly AttributeDef[] = STORE_ATTRIBUTES.filter(
  (a) => a.reportable,
)

/** 詳細モーダルの枠ごとの行（レジストリ順。付随フィールドは本体の行に含めて出すため除く） */
export function panelAttributes(panel: AttributePanel): readonly AttributeDef[] {
  return STORE_ATTRIBUTES.filter((a: AttributeDef) => a.panel === panel && a.parent === undefined)
}

/** 本体に添える付随フィールド（台数・内容） */
export function childAttributes(parentKey: string): readonly AttributeDef[] {
  return STORE_ATTRIBUTES.filter((a: AttributeDef) => a.parent === parentKey)
}

/** 充実度の項目グループ（レジストリ順・重複なし） */
export const COMPLETENESS_GROUPS: readonly string[] = [
  ...new Set(
    STORE_ATTRIBUTES.map((a: AttributeDef) => a.completeness).filter(
      (g): g is string => g !== undefined,
    ),
  ),
]

/** 店単位の値として意味のある値が入っているか（種類ごとの判定）。 */
function hasScalarValue(kind: AttributeKind, value: unknown): boolean {
  switch (kind) {
    case 'text':
      return typeof value === 'string' && value !== ''
    case 'ternary':
      return value !== undefined
    case 'list':
      return Array.isArray(value) && value.length > 0
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
  }
}

/**
 * 属性に値が入っているか。ゲーム別はいずれかのゲームのキーがあれば true
 * （充実度・登録済み判定で使う。従来の `Object.keys(record).length > 0` と同じ）。
 */
export function hasAttributeValue(def: AttributeDef, value: unknown): boolean {
  if (def.scope === 'game') {
    return !!value && typeof value === 'object' && Object.keys(value).length > 0
  }
  return hasScalarValue(def.kind, value)
}

/** 属性の値を取り出す（`Store` / `OverrideEntry` のどちらにも使う）。 */
export function readAttribute(source: object, def: AttributeDef): unknown {
  return (source as Record<string, unknown>)[def.key]
}

export const TERNARY_VALUES: readonly TernaryState[] = ['yes', 'no', 'unknown']

export const TERNARY_LABELS: Record<TernaryState, string> = {
  yes: 'あり',
  no: 'なし',
  unknown: '不明',
}
