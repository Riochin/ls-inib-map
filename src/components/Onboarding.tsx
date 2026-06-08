'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { getMarkerImage, type MarkerThemeKey } from '@/lib/marker-image'

const STORAGE_KEY = 'ls-exvs-onboarded'

const AUTHOR_NAME = 'マルハット'
const X_HANDLE = 'ls_boushi'
const X_URL = `https://x.com/${X_HANDLE}`
const REPO_URL = 'https://github.com/Riochin/ls-inib-map'
const TWEET_HASHTAG = 'ラストサバイニブ'
const TWEET_TEXT = 'ラスサバ・イニブの設置店舗マップ📍'
const HASHTAG_URL = `https://x.com/hashtag/${encodeURIComponent(TWEET_HASHTAG)}`
const INFO_REPORT_URL =
  'https://x.com/intent/post' +
  `?text=${encodeURIComponent(`@${X_HANDLE} 店舗情報の修正・提供：`)}` +
  `&hashtags=${encodeURIComponent(TWEET_HASHTAG)}`

// --- ブランド/外部リンク用アイコン ---

function XIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.438 9.63 8.205 11.19.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.333-1.724-1.333-1.724-1.089-.731.083-.716.083-.716 1.205.083 1.84 1.215 1.84 1.215 1.07 1.797 2.807 1.278 3.492.977.108-.76.418-1.279.762-1.573-2.665-.297-5.466-1.302-5.466-5.795 0-1.28.468-2.327 1.235-3.148-.124-.297-.535-1.49.117-3.106 0 0 1.008-.32 3.3 1.202a11.6 11.6 0 013.003-.395c1.02.005 2.047.135 3.006.395 2.29-1.523 3.297-1.202 3.297-1.202.653 1.616.242 2.81.118 3.106.769.821 1.233 1.868 1.233 3.148 0 4.504-2.805 5.494-5.478 5.785.43.36.814 1.07.814 2.157 0 1.557-.014 2.81-.014 3.193 0 .315.216.683.825.567C20.565 21.917 24 17.495 24 12.29 24 5.78 18.627.5 12 .5z" />
    </svg>
  )
}

// --- 実際のボタンと同じアイコン（アプリ本体から流用） ---

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function AreaIcon() {
  return (
    <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function LocateIcon() {
  return (
    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
    </svg>
  )
}

/** タイトル絞り込みを表す小さな縦長「ラスサバ」チップ（横書き2行・主要ユーザー層に合わせた代表表示） */
function FilterChipMini() {
  return (
    <span className="inline-flex flex-col items-center justify-center text-[8px] leading-[1.15] px-1.5 py-1.5 rounded-lg bg-purple-700 text-white font-semibold">
      <span>ラス</span>
      <span>サバ</span>
    </span>
  )
}

/** 実際のクラスタバブルを再現したミニチュア */
function ClusterMini() {
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#7B2FBE] text-white text-[11px] font-bold border-2 border-white shadow">
      5
    </span>
  )
}

/** ボタン風の白い丸チップでアイコンを囲み、本体ボタンと見た目を揃える */
function IconChip({ children }: { children: ReactNode }) {
  return (
    <span className="w-10 h-10 shrink-0 bg-white rounded-full shadow border border-gray-100 flex items-center justify-center">
      {children}
    </span>
  )
}

const STEPS: { visual: ReactNode; title: string; desc: string }[] = [
  {
    visual: <span className="w-10 shrink-0 flex justify-center"><FilterChipMini /></span>,
    title: 'タイトルで絞り込み',
    desc: '画面上部のボタンでラスサバ／イニブを切り替えできます。',
  },
  {
    visual: <IconChip><SearchIcon /></IconChip>,
    title: '店舗を検索',
    desc: '右上の検索ボタンから店舗名で探せます。選ぶと地図がその店舗へ移動します。',
  },
  {
    visual: <IconChip><AreaIcon /></IconChip>,
    title: 'エリアで絞り込み',
    desc: '左下のボタンで都道府県・市区町村を指定して絞り込めます。',
  },
  {
    visual: <IconChip><LocateIcon /></IconChip>,
    title: '現在地へ移動',
    desc: '左下のボタンで現在地を取得し、地図をその位置へ移動します。位置情報の許可が必要です。',
  },
  {
    visual: <span className="w-10 shrink-0 flex justify-center"><ClusterMini /></span>,
    title: 'まとまったピン',
    desc: '密集したピンは数字付きの丸にまとまります。タップ／ズームで個別に開きます。',
  },
]

const LEGEND: { theme: MarkerThemeKey; label: string }[] = [
  { theme: 'both', label: '両タイトル（ラスサバ＆イニブ）' },
  { theme: 'gundamOnly', label: 'イニブのみ' },
  { theme: 'delisted', label: '移設の可能性（公式一覧から消えた店舗）' },
  { theme: 'closed', label: '閉店' },
]

function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        onClick={onClick}
        className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white active:bg-gray-100 transition-colors text-gray-700 text-xl font-bold"
        aria-label="操作案内を表示"
      >
        ?
      </button>
    </div>
  )
}

function HowToPage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-800 mb-1">使い方</h2>
      <p className="text-xs text-gray-500 mb-4">ラスサバ・イニブの設置店舗マップへようこそ</p>

      <ul className="flex flex-col gap-3.5 mb-5">
        {STEPS.map((step) => (
          <li key={step.title} className="flex gap-3 items-center">
            {step.visual}
            <div>
              <p className="text-sm font-semibold text-gray-800">{step.title}</p>
              <p className="text-xs text-gray-600 leading-snug">{step.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-800 mb-2.5">ピンの見かた</p>
        <ul className="flex flex-col gap-2.5">
          {LEGEND.map(({ theme, label }) => {
            const img = getMarkerImage(theme)
            return (
              <li key={theme} className="flex items-center gap-3">
                <span className="w-10 flex justify-center shrink-0">
                  {/* 実際のマーカー画像を使った凡例 */}
                  <img src={img.url} alt="" className="h-7 w-auto" />
                </span>
                <span className="text-xs text-gray-700">{label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

/** Xへの投稿（ツイート）。本文・URL・ハッシュタグをプリフィルしてインテントを開く */
function ShareButton() {
  const handleTweet = () => {
    const url = window.location.origin
    const intent =
      'https://x.com/intent/post' +
      `?text=${encodeURIComponent(TWEET_TEXT)}` +
      `&url=${encodeURIComponent(url)}` +
      `&hashtags=${encodeURIComponent(TWEET_HASHTAG)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleTweet}
      className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
    >
      <XIcon />
      Xでツイートする
    </button>
  )
}

function AboutPage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-800 mb-1">このアプリについて</h2>
      <p className="text-xs text-gray-500 mb-4 leading-snug">
        ラスサバ・イニブの設置店舗を地図でまとめて確認できる非公式の個人開発アプリです。
      </p>

      <dl className="flex flex-col gap-3.5 mb-4">
        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">製作者</dt>
          <dd>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-800 hover:text-purple-700"
            >
              <span className="font-semibold">{AUTHOR_NAME}</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <XIcon />@{X_HANDLE}
              </span>
            </a>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">お問い合わせ</dt>
          <dd className="text-xs text-gray-700 leading-snug">
            不具合・ご要望など、X（
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline">
              @{X_HANDLE}
            </a>
            ）までお気軽にどうぞ。お問い合わせ待ってます！
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">店舗情報の修正・提供</dt>
          <dd>
            <a
              href={INFO_REPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 rounded-full text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <XIcon />
              Xで報告する
            </a>
            <p className="text-[11px] text-gray-500 mt-1 leading-snug">
              閉店・移設・新規設置などの情報をお寄せください。
            </p>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">ハッシュタグ</dt>
          <dd>
            <a
              href={HASHTAG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-semibold text-purple-700 hover:underline"
            >
              #{TWEET_HASHTAG}
            </a>
            <p className="text-[11px] text-gray-500 mt-1 leading-snug">
              投稿の際はこのタグでつぶやいてください。みんなの投稿も見られます。
            </p>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">ソースコード</dt>
          <dd>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-800 hover:text-purple-700"
            >
              <GitHubIcon />
              GitHub で公開中
            </a>
          </dd>
        </div>
      </dl>

      <ShareButton />
    </>
  )
}

function DataPrivacyPage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-800 mb-4">データとプライバシー</h2>

      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-sm font-semibold text-gray-800 mb-1">データについて</dt>
          <dd className="text-xs text-gray-600 leading-relaxed">
            店舗データは各公式サイトをもとに自動更新しています。反映までに時間差があり、最新の状況と異なる場合があります。実際の稼働状況は店舗へご確認ください。
          </dd>
        </div>

        <div>
          <dt className="text-sm font-semibold text-gray-800 mb-1">プライバシー</dt>
          <dd className="text-xs text-gray-600 leading-relaxed">
            現在地はブラウザ内で地図表示にのみ使用し、サーバーへ送信・保存することはありません。
          </dd>
        </div>

        <div>
          <dt className="text-sm font-semibold text-gray-800 mb-1">免責</dt>
          <dd className="text-xs text-gray-600 leading-relaxed">
            本アプリはファン制作の非公式サービスであり、株式会社バンダイナムコアミューズメント等の権利者とは一切関係ありません。
          </dd>
        </div>
      </dl>
    </>
  )
}

const PAGES = [HowToPage, AboutPage, DataPrivacyPage]
const PAGE_COUNT = PAGES.length

function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0)

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 relative max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="sticky top-0 float-right -mt-1 -mr-1 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="閉じる"
        >
          ✕
        </button>

        {(() => {
          const Page = PAGES[page]
          return <Page />
        })()}

        {/* ページインジケータ */}
        <div className="flex justify-center gap-1.5 mt-5">
          {Array.from({ length: PAGE_COUNT }, (_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? 'bg-gray-800' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        {/* フッターナビゲーション（3ページのウィザード） */}
        <div className="flex items-center justify-between gap-3 mt-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className={`text-xs text-gray-500 hover:text-gray-800 transition-colors ${page === 0 ? 'invisible' : ''}`}
          >
            ← 戻る
          </button>
          {page < PAGE_COUNT - 1 ? (
            <button
              onClick={() => setPage((p) => Math.min(PAGE_COUNT - 1, p + 1))}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)

  // localStorage 参照は副作用フェーズ限定（SSR/hydration安全・ちらつき防止・Req6.2）
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setIsOpen(true)
    } catch {
      // localStorage 不可（プライベートモード等）の場合は自動表示しない
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // 永続化できなくても表示自体は閉じる
    }
  }

  return (
    <>
      <HelpButton onClick={() => setIsOpen(true)} />
      {isOpen && <OnboardingModal onClose={handleClose} />}
    </>
  )
}
