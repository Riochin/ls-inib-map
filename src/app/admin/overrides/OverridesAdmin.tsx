'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { stores } from '@/data/stores'
import { filterStoresByKeyword } from '@/lib/filter'
import { getGameLabel, getCountSourceInfo, getThemeByKey } from '@/lib/marker-color'
import { toJstYmd } from '@/lib/pair-schedule'
import { CountBadge } from '@/components/CountBadge'
import { PairSchedulePanel } from '@/components/PairSchedulePanel'
import type { GameTitle, Provenance, Store } from '@/types/store'
import type { OverrideEntry, OverridesFile } from '@/types/overrides'

const GAMES: GameTitle[] = ['jojo-ls', 'gundam-exvs']
const SOURCES: Provenance[] = ['user-report', 'admin', 'auto-scrape', 'official']
const SOURCE_LABEL: Record<Provenance, string> = {
  'user-report': 'ユーザー報告（未確認）',
  admin: '管理者確認済み',
  'auto-scrape': '自動取得（未確認）',
  official: '公式',
}

interface FormState {
  counts: Record<GameTitle, string>
  source: Provenance
  note: string
  closed: boolean
  delisted: boolean
  name: string
  address: string
  lat: string
  lng: string
}

function emptyForm(): FormState {
  return {
    counts: { 'jojo-ls': '', 'gundam-exvs': '' },
    source: 'user-report',
    note: '',
    closed: false,
    delisted: false,
    name: '',
    address: '',
    lat: '',
    lng: '',
  }
}

/** 既存エントリ → フォーム初期値 */
function formFromEntry(entry: OverrideEntry): FormState {
  const f = emptyForm()
  f.source = entry.source
  f.note = entry.note ?? ''
  f.closed = entry.closed ?? false
  f.delisted = entry.delisted ?? false
  f.name = entry.name ?? ''
  f.address = entry.address ?? ''
  f.lat = entry.lat != null ? String(entry.lat) : ''
  f.lng = entry.lng != null ? String(entry.lng) : ''
  for (const g of GAMES) {
    const v = entry.machineCounts?.[g]
    f.counts[g] = v != null ? String(v) : ''
  }
  return f
}

/** フォーム → OverrideEntry（空項目は含めない）。上書き項目が無ければ null。 */
function entryFromForm(f: FormState): OverrideEntry | null {
  const entry: OverrideEntry = { source: f.source }
  let hasOverride = false

  const counts: Partial<Record<GameTitle, number>> = {}
  for (const g of GAMES) {
    const raw = f.counts[g].trim()
    if (raw === '') continue
    const n = Number(raw)
    if (!Number.isFinite(n)) continue
    counts[g] = n
  }
  if (Object.keys(counts).length > 0) {
    entry.machineCounts = counts
    hasOverride = true
  }

  if (f.note.trim()) entry.note = f.note.trim()
  if (f.closed) {
    entry.closed = true
    hasOverride = true
  }
  if (f.delisted) {
    entry.delisted = true
    hasOverride = true
  }
  if (f.name.trim()) {
    entry.name = f.name.trim()
    hasOverride = true
  }
  if (f.address.trim()) {
    entry.address = f.address.trim()
    hasOverride = true
  }
  const lat = Number(f.lat)
  if (f.lat.trim() && Number.isFinite(lat)) {
    entry.lat = lat
    hasOverride = true
  }
  const lng = Number(f.lng)
  if (f.lng.trim() && Number.isFinite(lng)) {
    entry.lng = lng
    hasOverride = true
  }

  return hasOverride ? entry : null
}

export function OverridesAdmin() {
  const [file, setFile] = useState<OverridesFile>({ overrides: {} })
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [status, setStatus] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [])
  const formRef = useRef<HTMLDivElement | null>(null)
  // ピン位置がおおよそ（ジオコード低精度）な要確認店。override で位置補正すると実行時に外れる
  const approximateStores = useMemo(() => stores.filter((s) => s.approximateLocation), [])

  // ペア戦日程プレビュー: 任意の「今日」を指定して地図の帯の見え方を確認する
  const [previewDate, setPreviewDate] = useState(() => toJstYmd(new Date()).iso)
  // 選んだ日付の JST 正午を「今日」として注入（タイムゾーンによる日ズレを避ける）
  const previewNow = useMemo(() => new Date(`${previewDate}T12:00:00+09:00`), [previewDate])
  const previewHeadLabel = useMemo(() => {
    const [, m, d] = previewDate.split('-')
    return `${Number(m)}/${Number(d)}`
  }, [previewDate])

  useEffect(() => {
    fetch('/api/overrides')
      .then((r) => r.json())
      .then((data: OverridesFile) => setFile(data?.overrides ? data : { overrides: {} }))
      .catch(() => setStatus('overrides.json の読み込みに失敗しました'))
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    return filterStoresByKeyword(stores, query).slice(0, 30)
  }, [query])

  const selected = selectedId ? storeById.get(selectedId) ?? null : null

  function selectStore(store: Store, scroll = false) {
    setSelectedId(store.id)
    const existing = file.overrides[store.id]
    setForm(existing ? formFromEntry(existing) : emptyForm())
    setStatus('')
    if (scroll) {
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  // POST前にディスクの最新状態を再フェッチしてからマージする。
  // ページを開いたまま手書き編集した場合の上書き消失を防ぐ。
  async function persist(
    computeNext: (current: OverridesFile) => OverridesFile,
    message: string,
  ) {
    setSaving(true)
    setStatus('')
    try {
      let current = file
      let refetchFailed = false
      try {
        const r = await fetch('/api/overrides')
        const data: OverridesFile = await r.json()
        if (data?.overrides) current = data
      } catch {
        refetchFailed = true
      }

      const next = computeNext(current)
      const res = await fetch('/api/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setFile(data.file as OverridesFile)
      setStatus(refetchFailed ? `${message}（注意: 最新データの取得に失敗したため、ローカルの状態で上書きしました）` : message)
    } catch (e) {
      setStatus(`保存に失敗: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function save() {
    if (!selected) return
    const entry = entryFromForm(form)
    if (!entry) {
      setStatus('上書きする項目がありません（台数・閉店・移設・店名等のいずれかを入力）')
      return
    }
    await persist(
      (current) => ({
        overrides: { ...current.overrides, [selected.id]: { note: selected.name, ...entry } },
      }),
      `保存しました: ${selected.name} (${selected.id})`,
    )
  }

  async function remove(id: string) {
    await persist((current) => {
      const overrides = { ...current.overrides }
      delete overrides[id]
      return { overrides }
    }, `削除しました: ${id}`)
    if (selectedId === id) setForm(emptyForm())
  }

  const overrideIds = Object.keys(file.overrides).sort()

  return (
    <main className="h-dvh overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 text-sm text-gray-800">
      <h1 className="text-xl font-bold mb-1">オーバーライド管理（localhost専用）</h1>
      <p className="text-xs text-gray-500 mb-6">
        公式データに重ねる手動修正を編集します。保存すると <code>src/data/overrides.json</code> に書き込まれ、
        次のビルドで地図に反映されます。本番では無効（404）。
      </p>

      {/* 出どころ別バッジ表示プレビュー（dev確認用） */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-600 mb-2">
          台数バッジの表示プレビュー（地図ではタップで出どころ表示）
        </h2>
        <div className="flex flex-col gap-2 items-start">
          {SOURCES.map((source) => {
            const info = getCountSourceInfo(source)
            return (
              <div key={source} className="flex items-center gap-2 flex-wrap">
                <CountBadge game="jojo-ls" count={4} theme={getThemeByKey('both')} confirmed={info.confirmed} />
                <CountBadge game="gundam-exvs" count={7} theme={getThemeByKey('gundamOnly')} confirmed={info.confirmed} />
                <span className="text-[11px] text-gray-500">{info.label}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          運営が確認した台数だけ通常色（確定）。それ以外（公式・みんなの報告・自動取得）は薄い（未確認）。
        </p>
      </section>

      {/* ペア戦開催日程プレビュー（dev確認用・地図のラスサバ帯と同じチップを再利用） */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-600 mb-2">
          ペア戦開催日程プレビュー（地図ではラスサバ選択中に左上の帯で表示）
        </h2>
        <label className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          プレビュー日付
          <input
            type="date"
            value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
          <button
            type="button"
            onClick={() => setPreviewDate(toJstYmd(new Date()).iso)}
            className="text-purple-700 hover:underline"
          >
            今日に戻す
          </button>
        </label>
        {/* 地図と同じ開閉チップ。畳んだ状態から開閉でき、日付を変えると見え方が変わる */}
        <div className="max-w-sm">
          <PairSchedulePanel now={previewNow} expandedWidthClassName="w-full" headLabel={previewHeadLabel} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">
          日付を変えると、その日が地図でどう表示されるか確認できます（畳んだ状態からタップで展開）。
        </p>
      </section>

      {/* 店舗検索 */}
      <section className="mb-6">
        <label className="block text-xs font-semibold text-gray-600 mb-1">店舗を検索</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="店名・住所で検索"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        {results.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded divide-y max-h-64 overflow-y-auto">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => selectStore(s)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                    selectedId === s.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                  {file.overrides[s.id] && (
                    <span className="ml-2 text-[10px] text-amber-600 font-semibold">override有</span>
                  )}
                  <span className="block text-xs text-gray-500">{s.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ピン位置 要確認リスト（ジオコード低精度・おおよその位置） */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-600 mb-1">
          ピン位置 要確認（おおよその位置・{approximateStores.length}件）
        </h2>
        <p className="text-[10px] text-gray-400 mb-2 leading-snug">
          「字＋地番」住所などで建物まで特定できずエリア重心に置かれた店舗。座標を override で
          補正すると一覧から外れ、地図の「おおよその位置」表示も消えます。
        </p>
        {approximateStores.length === 0 ? (
          <p className="text-xs text-gray-500">該当なし。</p>
        ) : (
          <ul className="border border-gray-200 rounded divide-y max-h-72 overflow-y-auto">
            {approximateStores.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <button onClick={() => selectStore(s, true)} className="text-left flex-1">
                  <span className="font-medium">{s.name}</span>
                  {file.overrides[s.id] && (
                    <span className="ml-2 text-[10px] text-amber-600 font-semibold">override有</span>
                  )}
                  <span className="block text-xs text-gray-500">{s.address}</span>
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
                >
                  地図で確認
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 編集フォーム */}
      {selected && (
        <section ref={formRef} className="mb-8 border border-gray-200 rounded p-4">
          <h2 className="font-bold mb-1">{selected.name}</h2>
          <p className="text-xs text-gray-500 mb-3">
            {selected.address}（id: <code>{selected.id}</code>）
          </p>
          <p className="text-xs text-gray-500 mb-4">
            現在の台数:{' '}
            {selected.games
              .map((g) => `${getGameLabel(g)} ${selected.machineCounts?.[g] ?? '—'}台`)
              .join(' / ')}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {GAMES.map((g) => (
              <label key={g} className="block">
                <span className="text-xs font-semibold text-gray-600">{getGameLabel(g)} 台数</span>
                <input
                  type="number"
                  value={form.counts[g]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, counts: { ...f.counts, [g]: e.target.value } }))
                  }
                  placeholder="未変更なら空欄"
                  className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
                />
              </label>
            ))}
          </div>

          <label className="block mb-3">
            <span className="text-xs font-semibold text-gray-600">出どころ（source）</span>
            <select
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as Provenance }))}
              className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block mb-3">
            <span className="text-xs font-semibold text-gray-600">メモ（任意）</span>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="例）ライブモニター除外・報告元"
              className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
            />
          </label>

          <div className="flex gap-4 mb-4 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.closed}
                onChange={(e) => setForm((f) => ({ ...f, closed: e.target.checked }))}
              />
              閉店にする
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.delisted}
                onChange={(e) => setForm((f) => ({ ...f, delisted: e.target.checked }))}
              />
              移設可能性にする
            </label>
          </div>

          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer">詳細（店名・住所・座標の上書き）</summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className="text-xs font-semibold text-gray-600">店名</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-semibold text-gray-600">住所</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">緯度 lat</span>
                <input
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">経度 lng</span>
                <input
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
                />
              </label>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded font-semibold disabled:opacity-50"
            >
              保存
            </button>
            {file.overrides[selected.id] && (
              <button
                onClick={() => remove(selected.id)}
                disabled={saving}
                className="px-4 py-2 border border-red-300 text-red-600 rounded disabled:opacity-50"
              >
                このoverrideを削除
              </button>
            )}
          </div>
        </section>
      )}

      {status && <p className="text-xs mb-6 text-gray-700">{status}</p>}

      {/* 既存override一覧 */}
      <section>
        <h2 className="text-sm font-bold mb-2">登録済みオーバーライド（{overrideIds.length}）</h2>
        {overrideIds.length === 0 ? (
          <p className="text-xs text-gray-500">まだありません。</p>
        ) : (
          <ul className="border border-gray-200 rounded divide-y">
            {overrideIds.map((id) => {
              const store = storeById.get(id)
              const entry = file.overrides[id]
              return (
                <li key={id} className="flex items-center justify-between px-3 py-2">
                  <button
                    onClick={() => store && selectStore(store)}
                    className="text-left flex-1"
                    disabled={!store}
                  >
                    <span className="font-medium">
                      {store?.name ?? entry.note ?? '(該当店舗なし)'}
                    </span>
                    {!store && (
                      <span className="ml-2 text-[10px] text-red-600 font-semibold">ID不一致</span>
                    )}
                    <span className="block text-xs text-gray-500">
                      {SOURCE_LABEL[entry.source]}
                      {entry.machineCounts &&
                        ' / ' +
                          GAMES.filter((g) => entry.machineCounts?.[g] != null)
                            .map((g) => `${getGameLabel(g)} ${entry.machineCounts?.[g]}台`)
                            .join(' ')}
                      {' '}
                      <code className="text-[10px]">{id}</code>
                    </span>
                  </button>
                  <button
                    onClick={() => remove(id)}
                    disabled={saving}
                    className="text-xs text-red-600 px-2 disabled:opacity-50"
                  >
                    削除
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      </div>
    </main>
  )
}
