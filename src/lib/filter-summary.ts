import type { AddressFilter, FacilityFilter, CompletenessLevel, StoreFilter } from '@/types/store'

/** 適用中バー用のチップ。key は {@link removeFilterChip} で削除対象を特定する識別子。 */
export interface FilterChip {
  key: string
  label: string
}

const FACILITY_LABELS: Record<keyof Omit<FacilityFilter, 'minMachines'>, string> = {
  hasStreaming: '配信台あり',
  hasRecording: '録画台あり',
  hasSmoking: '喫煙所あり',
  openOnly: '営業中',
}

/** 現在かかっている絞り込み条件をチップの配列に展開する（地方→都県→市区→区→設備→充実度の順）。 */
export function activeFilterChips(filter: StoreFilter): FilterChip[] {
  const { address, facility, completeness } = filter
  const chips: FilterChip[] = []

  if (address.region) chips.push({ key: 'region', label: address.region })
  for (const pref of address.prefectures) chips.push({ key: `pref:${pref}`, label: pref })
  for (const city of address.cities) chips.push({ key: `city:${city}`, label: city })
  for (const ward of address.wards) chips.push({ key: `ward:${ward}`, label: ward })

  if (facility.minMachines !== null) chips.push({ key: 'minMachines', label: `${facility.minMachines}台以上` })
  for (const k of ['hasStreaming', 'hasRecording', 'hasSmoking', 'openOnly'] as const) {
    if (facility[k]) chips.push({ key: `facility:${k}`, label: FACILITY_LABELS[k] })
  }

  if (completeness === 'rich') chips.push({ key: 'completeness', label: '情報が充実' })
  if (completeness === 'poor') chips.push({ key: 'completeness', label: '情報が不足' })

  return chips
}

/** チップの key を指定して、その条件だけを解除した新しいフィルターを返す。 */
export function removeFilterChip(filter: StoreFilter, key: string): StoreFilter {
  const address = { ...filter.address }
  const facility = { ...filter.facility }
  let completeness = filter.completeness

  if (key === 'region') {
    address.region = null
  } else if (key.startsWith('pref:')) {
    const pref = key.slice('pref:'.length)
    address.prefectures = address.prefectures.filter((p) => p !== pref)
    // 県の集合が変わると市区/区の前提が崩れるためリセット
    address.cities = []
    address.wards = []
  } else if (key.startsWith('city:')) {
    const city = key.slice('city:'.length)
    address.cities = address.cities.filter((c) => c !== city)
    address.wards = []
  } else if (key.startsWith('ward:')) {
    const ward = key.slice('ward:'.length)
    address.wards = address.wards.filter((w) => w !== ward)
  } else if (key === 'minMachines') {
    facility.minMachines = null
  } else if (key.startsWith('facility:')) {
    const fk = key.slice('facility:'.length) as keyof Omit<FacilityFilter, 'minMachines'>
    facility[fk] = false
  } else if (key === 'completeness') {
    completeness = 'all'
  }

  return { address, facility, completeness }
}

/** エリアセクションの現在の選択を1行サマリーにする。 */
export function describeAddress(address: AddressFilter): string {
  const segments: string[] = []
  if (address.region) segments.push(address.region)
  if (address.prefectures.length > 0) {
    segments.push(
      address.prefectures.length === 1
        ? address.prefectures[0]
        : `${address.prefectures[0]} ほか${address.prefectures.length - 1}`,
    )
  }
  if (address.cities.length > 0) {
    segments.push(
      address.cities.length === 1 ? address.cities[0] : `${address.cities[0]} ほか${address.cities.length - 1}`,
    )
  }
  return segments.length > 0 ? segments.join('・') : '指定なし'
}

/** 設備・条件セクションの現在の選択を1行サマリーにする。 */
export function describeFacility(facility: FacilityFilter): string {
  const parts: string[] = []
  if (facility.minMachines !== null) parts.push(`${facility.minMachines}台以上`)
  for (const k of ['hasStreaming', 'hasRecording', 'hasSmoking', 'openOnly'] as const) {
    if (facility[k]) parts.push(FACILITY_LABELS[k])
  }
  return parts.length > 0 ? parts.join('・') : '指定なし'
}

/** 情報の充実度セクションの現在の選択を1行サマリーにする。 */
export function describeCompleteness(level: CompletenessLevel): string {
  if (level === 'rich') return '情報が充実した店'
  if (level === 'poor') return '情報が不足した店'
  return '指定なし'
}
