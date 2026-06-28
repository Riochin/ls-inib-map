'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import type { FeedbackCategory } from '@/lib/report'
import { checkClientRateLimit, recordClientSubmission } from '@/lib/client-rate-limit'
import { trackEvent } from '@/lib/analytics'

interface FeedbackFormProps {
  onClose: () => void
}

const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  '新機能の提案',
  '既存機能の改善',
  '不具合',
  'その他',
]

export function FeedbackForm({ onClose }: FeedbackFormProps) {
  const [category, setCategory] = useState<FeedbackCategory>('新機能の提案')
  const [content, setContent] = useState('')
  const [reporter, setReporter] = useState('')
  const [noMention, setNoMention] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [cooldownMin, setCooldownMin] = useState(0)

  // localStorage はクライアント専用。ハイドレーション後に読むことで SSR(=0) との
  // ミスマッチを防ぐ。lazy 初期化にすると初回レンダーが不一致になるため effect が正解。
  useEffect(() => {
    const { limited, minutesUntilFree } = checkClientRateLimit()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 上記理由によりハイドレーション後の同期が必要
    if (limited) setCooldownMin(minutesUntilFree)
  }, [])

  const hasSns = reporter.trim() !== ''
  const isCoolingDown = cooldownMin > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'feedback',
          category,
          content,
          reporter: reporter.trim() || undefined,
          noMention: hasSns ? noMention : false,
          website,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      recordClientSubmission()
      trackEvent('submit_feedback')
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

        {status === 'done' ? (
          <div>
            <h3 className="text-lg text-gray-800 mb-1" style={HEADING_FONT_STYLE}>
              ありがとうございます！
            </h3>
            <p className="text-sm mb-4">
              ご要望を受け付けました🙏
              <br />
              内容を確認のうえ検討します（即時対応ではありません）。
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
            <h2 className="text-lg text-gray-800 mb-0.5" style={HEADING_FONT_STYLE}>
              サイトへのご要望
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-snug">
              不具合の報告・新機能のご提案など、なんでもお気軽にどうぞ。
            </p>

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
              <span className="text-xs font-semibold text-gray-600">種類</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 mt-0.5"
              >
                {FEEDBACK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-xs font-semibold text-gray-600">内容（必須）</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="例）〇〇の機能がほしい、△△のボタンが反応しない など"
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
              IDをいただくと、対応した際にお礼のご連絡ができる場合があります。
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

            {isCoolingDown && (
              <p className="text-xs text-amber-600 mb-3">
                10分間に3件まで送信できます（約{cooldownMin}分後に再送信可）
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending' || !content.trim() || isCoolingDown}
              className="w-full px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? '送信中…' : '送信する'}
            </button>
            <p className="text-[10px] text-gray-400 mt-2 leading-snug">
              いただいた内容は確認のうえ検討します（即時対応ではありません）。
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
