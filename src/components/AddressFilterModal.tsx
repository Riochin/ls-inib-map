'use client'

import { useState, useMemo } from 'react'
import type { AddressFilter, AddressIndex } from '@/types/store'
import { EMPTY_ADDRESS_FILTER } from '@/types/store'

interface AddressFilterModalProps {
  index: AddressIndex
  activeFilter: AddressFilter
  onApply: (filter: AddressFilter) => void
  onClose: () => void
}

const PREFECTURE_ORDER = ['東京都', '神奈川県', '埼玉県', '千葉県']

export function AddressFilterModal({ index, activeFilter, onApply, onClose }: AddressFilterModalProps) {
  // モーダルは開くたびに新規マウントされるため、初期値で activeFilter を取り込めば十分
  const [draft, setDraft] = useState<AddressFilter>(activeFilter)

  const prefectures = useMemo(() => {
    const known = PREFECTURE_ORDER.filter((p) => index.prefectureCities.has(p))
    const others = [...index.prefectureCities.keys()].filter((p) => !PREFECTURE_ORDER.includes(p)).sort()
    return [...known, ...others]
  }, [index])

  const cities = useMemo(
    () => (draft.prefecture ? (index.prefectureCities.get(draft.prefecture) ?? []) : []),
    [index, draft.prefecture],
  )

  const wards = useMemo(() => {
    if (!draft.prefecture || draft.cities.length === 0) return []
    const wardSets = draft.cities.flatMap(
      (city) => index.cityWards.get(`${draft.prefecture}|${city}`) ?? [],
    )
    return [...new Set(wardSets)].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [index, draft.prefecture, draft.cities])

  function selectPrefecture(pref: string | null) {
    setDraft({ prefecture: pref, cities: [], wards: [] })
  }

  function toggleCity(city: string) {
    const next = draft.cities.includes(city)
      ? draft.cities.filter((c) => c !== city)
      : [...draft.cities, city]
    setDraft({ ...draft, cities: next, wards: [] })
  }

  function toggleWard(ward: string) {
    const next = draft.wards.includes(ward)
      ? draft.wards.filter((w) => w !== ward)
      : [...draft.wards, ward]
    setDraft({ ...draft, wards: next })
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  function handleReset() {
    setDraft(EMPTY_ADDRESS_FILTER)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">エリアで絞り込む</h2>
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

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* 都県 */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">都県</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="prefecture"
                  checked={draft.prefecture === null}
                  onChange={() => selectPrefecture(null)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">すべて</span>
              </label>
              {prefectures.map((pref) => (
                <label key={pref} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="prefecture"
                    checked={draft.prefecture === pref}
                    onChange={() => selectPrefecture(pref)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{pref}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 市区 */}
          {draft.prefecture && cities.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">市区</p>
              <div className="grid grid-cols-2 gap-2">
                {cities.map((city) => (
                  <label key={city} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.cities.includes(city)}
                      onChange={() => toggleCity(city)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{city}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* 区 (政令指定都市) */}
          {wards.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">区</p>
              <div className="grid grid-cols-2 gap-2">
                {wards.map((ward) => (
                  <label key={ward} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.wards.includes(ward)}
                      onChange={() => toggleWard(ward)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{ward}</span>
                  </label>
                ))}
              </div>
            </section>
          )}
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
            className="flex-1 py-3 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
