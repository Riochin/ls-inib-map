'use client'

import { useState, useEffect, type FormEvent } from 'react'
import type { Store, TernaryState } from '@/types/store'
import type { CorrectionType } from '@/lib/report'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { checkClientRateLimit, recordClientSubmission } from '@/lib/client-rate-limit'

interface StoreInfoFormProps {
  store: Store
  onClose: () => void
}

const PAYMENT_OPTIONS = [
  '交通系IC（Suica/PASMOなど）',
  'PayPay',
  'd払い',
  '楽天ペイ',
  'LINE Pay',
  'nanaco',
  'WAON',
  'iD',
  'QUICPay',
  'クレジットカード',
]

const TERNARY_OPTIONS: { value: TernaryState; label: string }[] = [
  { value: 'yes', label: 'あり' },
  { value: 'no', label: 'なし' },
  { value: 'unknown', label: '不明' },
]

/** 数値入力をパースする。空欄・非数値・非有限値は undefined（送信しない）として扱う。 */
function parseCount(v: string): number | undefined {
  const t = v.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** すでに登録済みの項目に添えるバッジ（既存情報だと一目で分かるように・配色は既存の gray 系に統一） */
function FilledBadge() {
  return (
    <span className="ml-1.5 align-middle text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
      登録済み
    </span>
  )
}

export function StoreInfoForm({ store, onClose }: StoreInfoFormProps) {
  const hasJojo = store.games.includes('jojo-ls')
  const hasGundam = store.games.includes('gundam-exvs')

  const [jojoLs, setJojoLs] = useState(
    store.machineCounts?.['jojo-ls'] !== undefined
      ? String(store.machineCounts['jojo-ls'])
      : '',
  )
  const [gundamExvs, setGundamExvs] = useState(
    store.machineCounts?.['gundam-exvs'] !== undefined
      ? String(store.machineCounts['gundam-exvs'])
      : '',
  )
  const [businessHours, setBusinessHours] = useState(store.businessHours ?? '')
  const [floor, setFloor] = useState(store.floor ?? '')
  const [smoking, setSmoking] = useState<TernaryState | ''>(store.smoking ?? '')
  const [payments, setPayments] = useState<string[]>(store.payments ?? [])
  const [hasRecording, setHasRecording] = useState<TernaryState | ''>(store.hasRecording ?? '')
  const [hasStreaming, setHasStreaming] = useState<TernaryState | ''>(store.hasStreaming ?? '')
  const [correctionType, setCorrectionType] = useState<CorrectionType | ''>('')
  const [correctionNote, setCorrectionNote] = useState('')
  const [reporter, setReporter] = useState('')
  const [noMention, setNoMention] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [cooldownMin, setCooldownMin] = useState(0)

  // localStorage はクライアント専用。ハイドレーション後に読むことで SSR(=0) との
  // ミスマッチを防ぐ。lazy 初期化にすると初回レンダーが不一致になるため effect が正解。
  useEffect(() => {
    const { limited, minutesUntilFree } = checkClientRateLimit()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 上記理由によりハイドレーション後の同期が必要
    if (limited) setCooldownMin(minutesUntilFree)
  }, [])

  const mark = () => setIsDirty(true)

  const hasSns = reporter.trim() !== ''

  const jojoNum = parseCount(jojoLs)
  const gundamNum = parseCount(gundamExvs)

  const hasAnyInput =
    (jojoNum !== undefined && hasJojo) ||
    (gundamNum !== undefined && hasGundam) ||
    businessHours.trim() !== '' ||
    floor.trim() !== '' ||
    smoking !== '' ||
    payments.length > 0 ||
    hasRecording !== '' ||
    hasStreaming !== '' ||
    correctionType !== '' ||
    correctionNote.trim() !== ''

  const isCoolingDown = cooldownMin > 0

  // すでに登録済みの項目（バッジ表示・初期入力の根拠）
  const filled = {
    jojo: store.machineCounts?.['jojo-ls'] !== undefined,
    gundam: store.machineCounts?.['gundam-exvs'] !== undefined,
    businessHours: !!store.businessHours,
    floor: !!store.floor,
    smoking: store.smoking !== undefined,
    payments: (store.payments?.length ?? 0) > 0,
    hasRecording: store.hasRecording !== undefined,
    hasStreaming: store.hasStreaming !== undefined,
  }
  const hasExistingInfo = Object.values(filled).some(Boolean)

  function togglePayment(option: string) {
    setPayments((prev) =>
      prev.includes(option) ? prev.filter((p) => p !== option) : [...prev, option],
    )
    mark()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()

    setStatus('sending')
    setErrorMsg('')

    const payload: Record<string, unknown> = {
      mode: 'structured-store',
      storeId: store.id,
      storeName: store.name,
      storeAddress: store.address,
      reporter: reporter.trim() || undefined,
      noMention: hasSns ? noMention : false,
      website,
    }

    if (hasJojo && jojoNum !== undefined) payload.machineCountsJojoLs = jojoNum
    if (hasGundam && gundamNum !== undefined) payload.machineCountsGundamExvs = gundamNum
    if (businessHours.trim()) payload.businessHours = businessHours.trim()
    if (floor.trim()) payload.floor = floor.trim()
    if (smoking !== '') payload.smoking = smoking
    if (payments.length > 0) payload.payments = payments
    if (hasRecording !== '') payload.hasRecording = hasRecording
    if (hasStreaming !== '') payload.hasStreaming = hasStreaming
    if (correctionType !== '') payload.correctionType = correctionType
    if (correctionNote.trim()) payload.correctionNote = correctionNote.trim()

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      recordClientSubmission()
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl md:max-w-lg shadow-xl text-sm text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="text-lg text-gray-800" style={HEADING_FONT_STYLE}>
              店舗情報を提供する
            </h2>
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4 break-words">{store.name}</p>

          {status === 'done' ? (
            <div>
              <p className="text-sm mb-4">
                情報を受け付けました🙏
                <br />
                内容を確認のうえ反映します（即時ではありません）。
              </p>
              <button
                onClick={onClose}
                className="w-full px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {/* honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />

              {hasExistingInfo && (
                <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4 leading-snug">
                  「<span className="text-gray-700 font-semibold">登録済み</span>」の項目は、すでに反映されている情報です。修正・追加があれば上書きしてください。
                </p>
              )}

              {/* 設置台数 */}
              <p className="text-xs font-semibold text-gray-600 mb-2">設置台数</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {hasJojo && (
                  <label className="block">
                    <span className="text-xs text-gray-500">
                      ジョジョ LS{filled.jojo && <FilledBadge />}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={jojoLs}
                      onChange={(e) => { setJojoLs(e.target.value); mark() }}
                      placeholder="台数"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </label>
                )}
                {hasGundam && (
                  <label className="block">
                    <span className="text-xs text-gray-500">
                      イニブ（EXVS2）{filled.gundam && <FilledBadge />}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={gundamExvs}
                      onChange={(e) => { setGundamExvs(e.target.value); mark() }}
                      placeholder="台数"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                    />
                  </label>
                )}
              </div>

              {/* 営業時間 */}
              <label className="block mb-3">
                <span className="text-xs font-semibold text-gray-600">
                  営業時間{filled.businessHours && <FilledBadge />}
                </span>
                <input
                  type="text"
                  value={businessHours}
                  onChange={(e) => { setBusinessHours(e.target.value); mark() }}
                  maxLength={100}
                  placeholder="例）10:00〜23:00"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                />
              </label>

              {/* フロア */}
              <label className="block mb-3">
                <span className="text-xs font-semibold text-gray-600">
                  フロア{filled.floor && <FilledBadge />}
                </span>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => { setFloor(e.target.value); mark() }}
                  maxLength={50}
                  placeholder="例）2F、地下1F"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                />
              </label>

              {/* 喫煙所 */}
              <label className="block mb-3">
                <span className="text-xs font-semibold text-gray-600">
                  喫煙所{filled.smoking && <FilledBadge />}
                </span>
                <select
                  value={smoking}
                  onChange={(e) => { setSmoking(e.target.value as TernaryState | ''); mark() }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                >
                  <option value="">— 未入力 —</option>
                  {TERNARY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* 決済/電子マネー */}
              <fieldset className="mb-3">
                <legend className="text-xs font-semibold text-gray-600 mb-1.5">
                  決済・電子マネー（使えるものをすべて選択）{filled.payments && <FilledBadge />}
                </legend>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={payments.includes(opt)}
                        onChange={() => togglePayment(opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 録画台 */}
              <label className="block mb-3">
                <span className="text-xs font-semibold text-gray-600">
                  録画台{filled.hasRecording && <FilledBadge />}
                </span>
                <select
                  value={hasRecording}
                  onChange={(e) => { setHasRecording(e.target.value as TernaryState | ''); mark() }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                >
                  <option value="">— 未入力 —</option>
                  {TERNARY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* 配信台 */}
              <label className="block mb-4">
                <span className="text-xs font-semibold text-gray-600">
                  配信台{filled.hasStreaming && <FilledBadge />}
                </span>
                <select
                  value={hasStreaming}
                  onChange={(e) => { setHasStreaming(e.target.value as TernaryState | ''); mark() }}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                >
                  <option value="">— 未入力 —</option>
                  {TERNARY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* 修正・通報セクション */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">修正・通報（任意）</p>
                <label className="block mb-2">
                  <span className="text-xs text-gray-500">種別</span>
                  <select
                    value={correctionType}
                    onChange={(e) => { setCorrectionType(e.target.value as CorrectionType | ''); mark() }}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                  >
                    <option value="">— 選択 —</option>
                    <option value="位置ズレ">位置ズレ（ピンが実際の場所と違う）</option>
                    <option value="閉店・移設">閉店・移設</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">メモ（任意）</span>
                  <textarea
                    value={correctionNote}
                    onChange={(e) => { setCorrectionNote(e.target.value); mark() }}
                    rows={2}
                    maxLength={500}
                    placeholder="例）ピンが南側にずれています、2025年3月に閉店しました など"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5 resize-y"
                  />
                </label>
              </div>

              {/* SNS ID */}
              <label className="block mb-1">
                <span className="text-xs font-semibold text-gray-600">
                  SNS ID（X / Twitter 等・任意）
                </span>
                <input
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  maxLength={80}
                  placeholder="@your_id"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
                />
              </label>
              <p className="text-[10px] text-gray-400 mb-3 leading-snug">
                SNS IDをいただくと、運営が確認のうえ「確定情報」として掲載できる場合があります。
                未記入の場合は「みんなの報告（未確認）」としての掲載になります。
              </p>

              {hasSns && (
                <label className="flex items-start gap-1.5 mb-4 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={noMention}
                    onChange={(e) => setNoMention(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>お礼のツイート（メンション付き）はしないでほしい</span>
                </label>
              )}

              {status === 'error' && (
                <p className="text-xs text-red-600 mb-3">{errorMsg}</p>
              )}

              {isCoolingDown && (
                <p className="text-xs text-amber-600 mb-3">
                  10分間に3件まで送信できます（約{cooldownMin}分後に再送信可）
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !isDirty || !hasAnyInput || isCoolingDown}
                className="w-full px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {status === 'sending' ? '送信中…' : '送信する'}
              </button>
              <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                いただいた情報は確認のうえ反映します（即時反映ではありません）。
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
