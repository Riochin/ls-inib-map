'use client'

import { useState, type FormEvent } from 'react'
import type { Store } from '@/types/store'
import { REPORT_TYPES, type ReportType } from '@/lib/report'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'

/**
 * 店舗情報の「修正を報告」フォーム（モーダル）。地図の InfoWindow から開く。
 *
 * - 対象店（id/name/address）は自動添付。項目は最小（種別・自由記述・任意の名前）。
 * - 送信先は公開 API `/api/report`。サーバーが検証して GitHub Issue（手動トリアージ）化する。
 * - bot 対策の honeypot（視覚的に隠した `website` 入力）を仕込む。人は触れない。
 * - 「即時反映ではない」ことを明記（ノンテック層向け・平易表記）。
 */
export function ReportModal({
  store,
  onClose,
}: {
  store: Pick<Store, 'id' | 'name' | 'address'>
  onClose: () => void
}) {
  const [type, setType] = useState<ReportType>(REPORT_TYPES[0])
  const [text, setText] = useState('')
  const [reporter, setReporter] = useState('')
  const [noMention, setNoMention] = useState(false)
  const [website, setWebsite] = useState('') // honeypot（bot用・人は空のまま）
  const hasSns = reporter.trim() !== ''
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setErrorMsg('内容を入力してください。')
      setStatus('error')
      return
    }
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          storeName: store.name,
          storeAddress: store.address,
          type,
          text,
          reporter,
          noMention: hasSns ? noMention : false,
          website,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 text-sm text-gray-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>

        <h2 className="text-lg text-gray-800 mb-0.5" style={HEADING_FONT_STYLE}>
          情報の修正を報告
        </h2>
        <p className="text-xs text-gray-500 mb-4 break-words">{store.name}</p>

        {status === 'done' ? (
          <div>
            <h3 className="text-lg text-gray-800 mb-1" style={HEADING_FONT_STYLE}>
              ありがとうございます！
            </h3>
            <p className="text-sm mb-4">
              報告を受け付けました🙏
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
            {/* honeypot: 視覚的に隠す。bot が埋めたらサーバーで破棄 */}
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

            <label className="block mb-3">
              <span className="text-xs font-semibold text-gray-600">報告の種類</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-xs font-semibold text-gray-600">内容（必須）</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="例）イニブは実際8台です／ピンが実際の場所より南にずれています など"
                className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5 resize-y"
              />
            </label>

            <label className="block mb-1">
              <span className="text-xs font-semibold text-gray-600">SNS ID（X / Twitter 等・任意）</span>
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

            {status === 'error' && <p className="text-xs text-red-600 mb-3">{errorMsg}</p>}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? '送信中…' : '送信する'}
            </button>
            <p className="text-[10px] text-gray-400 mt-2 leading-snug">
              いただいた内容は確認のうえ反映します（即時反映ではありません）。
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
