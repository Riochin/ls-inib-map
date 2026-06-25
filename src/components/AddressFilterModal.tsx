'use client'

import { useState, useMemo } from 'react'
import type { AddressFilter, AddressIndex, FacilityFilter, StoreFilter, CompletenessLevel, FilterOption } from '@/types/store'
import { EMPTY_STORE_FILTER } from '@/types/store'
import { REGIONS, prefecturesOfRegion } from '@/lib/region'
import {
  activeFilterChips,
  removeFilterChip,
  describeAddress,
  describeFacility,
  describeCompleteness,
} from '@/lib/filter-summary'
import { trackEvent } from '@/lib/analytics'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'

interface AddressFilterModalProps {
  index: AddressIndex
  filter: StoreFilter
  /** 上部タブと同じゲームタイトル選択。適用時に上部タブも同期させる。 */
  gameFilter: FilterOption
  onApply: (filter: StoreFilter) => void
  onGameFilterChange: (filter: FilterOption) => void
  onClose: () => void
  /** ドラフト条件での結果件数を返す（リアルタイム件数表示用・任意）。 */
  previewCount?: (filter: StoreFilter, game: FilterOption) => number
}

type SectionKey = 'area' | 'facility' | 'completeness'

const GAME_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'jojo-ls', label: 'ラスサバ' },
  { value: 'gundam-exvs', label: 'イニブ' },
]

const MIN_MACHINE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '指定なし' },
  { value: 2, label: '2台〜' },
  { value: 3, label: '3台〜' },
  { value: 4, label: '4台〜' },
  { value: 6, label: '6台〜' },
  { value: 8, label: '8台〜' },
]

const PREFECTURE_ORDER = ['東京都', '神奈川県', '埼玉県', '千葉県']

const COMPLETENESS_OPTIONS: { value: CompletenessLevel; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'rich', label: '情報が充実した店' },
  { value: 'poor', label: '情報が不足した店' },
]

const FACILITY_TOGGLES: { key: keyof Omit<FacilityFilter, 'minMachines'>; label: string }[] = [
  { key: 'hasStreaming', label: '配信台あり' },
  { key: 'hasRecording', label: '録画台あり' },
  { key: 'hasSmoking', label: '喫煙所あり' },
  { key: 'openOnly', label: '営業中のみ' },
]

export function AddressFilterModal({
  index,
  filter,
  gameFilter,
  onApply,
  onGameFilterChange,
  onClose,
  previewCount,
}: AddressFilterModalProps) {
  // モーダルは開くたびに新規マウントされるため、初期値で filter を取り込めば十分
  const [draft, setDraft] = useState<StoreFilter>(filter)
  const [gameDraft, setGameDraft] = useState<FilterOption>(gameFilter)
  // アコーディオン開閉。初期は「設備・条件」だけ開いた状態でスタート。
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    area: false,
    facility: true,
    completeness: false,
  })
  const address = draft.address
  const facility = draft.facility

  const chips = activeFilterChips(draft)
  const count = previewCount ? previewCount(draft, gameDraft) : null

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }))
  }

  // 地方が選択されていればその地方の都県のみ、なければ既定順（主要4都県を優先）
  const prefectures = useMemo(() => {
    const present = (p: string) => index.prefectureCities.has(p)
    if (address.region) {
      return prefecturesOfRegion(address.region).filter(present)
    }
    const known = PREFECTURE_ORDER.filter(present)
    const others = [...index.prefectureCities.keys()].filter((p) => !PREFECTURE_ORDER.includes(p)).sort()
    return [...known, ...others]
  }, [index, address.region])

  // 市区/区への絞り込みは都道府県を1つだけ選んだときに使う（複数県選択時は県単位の絞り込み）。
  const singlePrefecture = address.prefectures.length === 1 ? address.prefectures[0] : null

  const cities = useMemo(
    () => (singlePrefecture ? (index.prefectureCities.get(singlePrefecture) ?? []) : []),
    [index, singlePrefecture],
  )

  const wards = useMemo(() => {
    if (!singlePrefecture || address.cities.length === 0) return []
    const wardSets = address.cities.flatMap(
      (city) => index.cityWards.get(`${singlePrefecture}|${city}`) ?? [],
    )
    return [...new Set(wardSets)].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [index, singlePrefecture, address.cities])

  function patchAddress(next: Partial<AddressFilter>) {
    setDraft((d) => ({ ...d, address: { ...d.address, ...next } }))
  }

  function selectRegion(region: string | null) {
    // 地方を切り替えたら都県以下はリセット
    setDraft((d) => ({ ...d, address: { region, prefectures: [], cities: [], wards: [] } }))
  }

  function togglePrefecture(pref: string) {
    const next = address.prefectures.includes(pref)
      ? address.prefectures.filter((p) => p !== pref)
      : [...address.prefectures, pref]
    // 県の選択が変わったら市区/区はリセット
    patchAddress({ prefectures: next, cities: [], wards: [] })
  }

  function toggleCity(city: string) {
    const next = address.cities.includes(city)
      ? address.cities.filter((c) => c !== city)
      : [...address.cities, city]
    patchAddress({ cities: next, wards: [] })
  }

  function toggleWard(ward: string) {
    const next = address.wards.includes(ward)
      ? address.wards.filter((w) => w !== ward)
      : [...address.wards, ward]
    patchAddress({ wards: next })
  }

  function setFacility(next: Partial<FacilityFilter>) {
    setDraft((d) => ({ ...d, facility: { ...d.facility, ...next } }))
  }

  function setCompleteness(level: CompletenessLevel) {
    setDraft((d) => ({ ...d, completeness: level }))
  }

  function handleApply() {
    onApply(draft)
    // ゲームタイトル選択を上部タブへ同期（変化時のみ。saveFilter/track は呼び出し側で実施）。
    if (gameDraft !== gameFilter) onGameFilterChange(gameDraft)
    // 都県未選択（すべて）は 'all' として計上。複数選択は連結して送る。市区の選択数も併せて。
    trackEvent('select_prefecture', {
      prefecture: address.prefectures.length === 0 ? 'all' : address.prefectures.join(','),
      city_count: address.cities.length,
    })
    onClose()
  }

  function handleReset() {
    setDraft(EMPTY_STORE_FILTER)
    setGameDraft('all')
  }

  const subLabelClass = 'text-xs font-semibold text-gray-500 mb-2'

  function renderAccordionHeader(key: SectionKey, title: string, summary: string) {
    const isOpen = openSections[key]
    return (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <span className="ml-auto text-xs text-gray-400 truncate max-w-[150px]">{summary}</span>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base text-gray-800" style={HEADING_FONT_STYLE}>絞り込み</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="閉じる"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 適用中バー（条件チップ＋個別解除） */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setDraft((d) => removeFilterChip(d, chip.key))}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium hover:bg-purple-200 transition-colors"
                aria-label={`${chip.label} を外す`}
              >
                {chip.label}
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {/* ゲームタイトル（上部タブと同期） */}
          <div className="px-4 py-3">
            <p className={subLabelClass}>ゲームタイトル</p>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
              {GAME_OPTIONS.map(({ value, label }) => {
                const active = gameDraft === value
                return (
                  <button
                    key={value}
                    type="button"
                    name={`game-${value}`}
                    aria-pressed={active}
                    onClick={() => setGameDraft(value)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-purple-700 text-white' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* エリア */}
          <section>
            {renderAccordionHeader('area', 'エリア', describeAddress(address))}
            <div className={`px-4 pb-4 space-y-4 ${openSections.area ? '' : 'hidden'}`}>
              <div>
                <p className={subLabelClass}>地方</p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="region"
                      checked={address.region === null}
                      onChange={() => selectRegion(null)}
                      className="w-4 h-4 accent-purple-700"
                    />
                    <span className="text-sm text-gray-700">すべて</span>
                  </label>
                  {REGIONS.map((region) => (
                    <label key={region} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="region"
                        checked={address.region === region}
                        onChange={() => selectRegion(region)}
                        className="w-4 h-4 accent-purple-700"
                      />
                      <span className="text-sm text-gray-700">{region}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className={subLabelClass}>都道府県（複数選択可）</p>
                <div className="grid grid-cols-2 gap-2">
                  {prefectures.map((pref) => (
                    <label key={pref} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name={`prefecture-${pref}`}
                        checked={address.prefectures.includes(pref)}
                        onChange={() => togglePrefecture(pref)}
                        className="w-4 h-4 rounded accent-purple-700"
                      />
                      <span className="text-sm text-gray-700">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              {cities.length > 0 && (
                <div>
                  <p className={subLabelClass}>市区</p>
                  <div className="grid grid-cols-2 gap-2">
                    {cities.map((city) => (
                      <label key={city} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={address.cities.includes(city)}
                          onChange={() => toggleCity(city)}
                          className="w-4 h-4 rounded accent-purple-700"
                        />
                        <span className="text-sm text-gray-700">{city}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {wards.length > 0 && (
                <div>
                  <p className={subLabelClass}>区</p>
                  <div className="grid grid-cols-2 gap-2">
                    {wards.map((ward) => (
                      <label key={ward} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={address.wards.includes(ward)}
                          onChange={() => toggleWard(ward)}
                          className="w-4 h-4 rounded accent-purple-700"
                        />
                        <span className="text-sm text-gray-700">{ward}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 設備・条件 */}
          <section>
            {renderAccordionHeader('facility', '設備・条件', describeFacility(facility))}
            <div className={`px-4 pb-4 ${openSections.facility ? '' : 'hidden'}`}>
              <div className="mb-4">
                <p className={subLabelClass}>最低台数</p>
                <div className="flex flex-wrap gap-2">
                  {MIN_MACHINE_OPTIONS.map(({ value, label }) => {
                    const active = facility.minMachines === value
                    return (
                      <button
                        key={label}
                        type="button"
                        name={`min-${value ?? 'none'}`}
                        aria-pressed={active}
                        onClick={() => setFacility({ minMachines: value })}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          active
                            ? 'bg-purple-700 border-purple-700 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-purple-400'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className={subLabelClass}>こだわり条件</p>
              <div className="grid grid-cols-2 gap-2">
                {FACILITY_TOGGLES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name={`facility-${key}`}
                      checked={facility[key]}
                      onChange={(e) => setFacility({ [key]: e.target.checked } as Partial<FacilityFilter>)}
                      className="w-4 h-4 rounded accent-purple-700"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* 情報の充実度 */}
          <section>
            {renderAccordionHeader('completeness', '情報の充実度', describeCompleteness(draft.completeness))}
            <div className={`px-4 pb-4 ${openSections.completeness ? '' : 'hidden'}`}>
              <div className="space-y-2">
                {COMPLETENESS_OPTIONS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="completeness"
                      value={value}
                      checked={draft.completeness === value}
                      onChange={() => setCompleteness(value)}
                      className="w-4 h-4 accent-purple-700"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-[2] py-3 rounded-xl bg-purple-700 text-sm font-medium text-white hover:bg-purple-800 active:bg-purple-900 transition-colors"
          >
            {count !== null ? `${count}件を表示` : '適用'}
          </button>
        </div>
      </div>
    </>
  )
}
