'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { getMarkerImage, MARKER_SHADOW_FILTER, type MarkerThemeKey } from '@/lib/marker-image'
import { getThemeByKey } from '@/lib/marker-color'
import { CountBadge } from './CountBadge'
// 見出し系の丸ゴシック（M PLUS Rounded 1c）。送信フォーム等と共有しトーンを揃える。
import { HEADING_FONT_STYLE, CATCH_FONT_STYLE } from '@/lib/heading-font'
// 新機能ページの内容は src/data/releases.ts に集約（追加はそこへ1エントリ足すだけ）。
import { releases, latestRelease, type Release, type ReleaseHighlight } from '@/data/releases'
import { FeedbackForm } from './FeedbackForm'
import { trackEvent } from '@/lib/analytics'

const STORAGE_KEY = 'ls-exvs-onboarded'

// 新機能告知のバージョン管理。再訪ユーザーに「未読の新バージョン」がある時だけ
// 新機能ページから自動オープンする（初回ユーザーのチュートリアルは邪魔しない）。
// 最新版は releases.ts の先頭で決まる（releases に新エントリを足せば自動で上がる）。
const NEWS_VERSION = latestRelease.version
const NEWS_SEEN_KEY = 'ls-exvs-news-seen'

const AUTHOR_NAME = 'マルハット'
const X_HANDLE = 'ls_boushi'
const X_URL = `https://x.com/${X_HANDLE}`
const SITE_URL = 'https://lsib.world/'
const TWEET_HASHTAG = 'ラストサバイニブ'
const TWEET_TEXT = 'ラスサバ・イニブの設置店舗マップ📍'
const HASHTAG_URL = `https://x.com/hashtag/${encodeURIComponent(TWEET_HASHTAG)}`
const SHARE_URL =
  'https://x.com/intent/post' +
  `?text=${encodeURIComponent(TWEET_TEXT)}` +
  `&url=${encodeURIComponent(SITE_URL)}` +
  `&hashtags=${encodeURIComponent(TWEET_HASHTAG)}`

// --- ブランド/外部リンク用アイコン ---

function XIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
  { theme: 'both', label: 'ラスサバ設置店' },
  { theme: 'gundamOnly', label: 'イニブ設置店' },
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
      <h2
        className="text-xl text-gray-900 mb-1 tracking-tight"
        style={CATCH_FONT_STYLE}
      >
        戦場選びをサクッと<span className="text-purple-700">10秒</span>に。
      </h2>
      <p className="text-xs text-gray-500 mb-6">ラスサバ・イニブの設置店舗マップへようこそ</p>

      <ul className="flex flex-col gap-2">
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
    </>
  )
}

function LegendPage() {
  return (
    <>
      <h2 className="text-lg text-gray-800 mb-1" style={HEADING_FONT_STYLE}>ピンの見かた</h2>
      <p className="text-xs text-gray-500 mb-3">地図上のピンは色と形で状態を表します。</p>

      <ul className="flex flex-col gap-2">
        {LEGEND.map(({ theme, label }) => {
          const img = getMarkerImage(theme)
          return (
            <li key={theme} className="flex items-center gap-3">
              <span className="w-10 flex justify-center shrink-0">
                {/* 実際のマーカー画像を使った凡例 */}
                <img src={img.url} alt="" className="h-7 w-auto" style={{ filter: MARKER_SHADOW_FILTER }} />
              </span>
              <span className="text-xs text-gray-700">{label}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <h2 className="text-lg text-gray-800 mb-1" style={HEADING_FONT_STYLE}>台数の見かた</h2>
        <p className="text-xs text-gray-500 mb-3">台数バッジは色の濃さで確からしさを表します。</p>

        <ul className="flex flex-col gap-2">
          <li className="flex items-center gap-3">
            <span className="shrink-0">
              <CountBadge game="gundam-exvs" count={7} theme={getThemeByKey('gundamOnly')} confirmed />
            </span>
            <span className="text-xs text-gray-700">現地ユーザーからの確認あり✔︎（はっきり表示）</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="shrink-0">
              <CountBadge game="gundam-exvs" count={9} theme={getThemeByKey('gundamOnly')} confirmed={false} />
            </span>
            <span className="text-xs text-gray-700">
              公式サイト・自動取得の台数。タップすると出どころが見られます
            </span>
          </li>
        </ul>

        <p className="text-[11px] text-gray-500 mt-3 leading-snug">
          ※イニブの公式サイトは「ライブモニター」を含めて台数を表示するため、実際の設置台数より多い場合があります。
        </p>
      </div>
    </>
  )
}

/**
 * Xへの投稿（ツイート）。本文・URL・ハッシュタグをプリフィルしてインテントを開く。
 * window.open() などのJS起動だとiOS/AndroidのUniversal Links/App Linksが発火せず
 * ブラウザ（未ログインのin-app browser）に落ちるため、本物の<a>タップで開く。
 */
function ShareButton() {
  return (
    <a
      href={SHARE_URL}
      rel="noopener noreferrer"
      className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
    >
      <XIcon />
      Xでシェアする
    </a>
  )
}

function AboutPage({ onOpenFeedback }: { onOpenFeedback?: () => void }) {
  return (
    <>
      <h2 className="text-lg text-gray-800 mb-1" style={HEADING_FONT_STYLE}>このアプリについて</h2>
      <p className="text-xs text-gray-500 mb-3 leading-snug">
        ラスサバ・イニブの設置店舗を地図でまとめて確認できる非公式の個人開発アプリです。
      </p>

      <dl className="flex flex-col gap-3 mb-3">
        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">開発者</dt>
          <dd>
            <a
              href={X_URL}
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
          <dt className="text-xs font-semibold text-gray-500 mb-1">ご要望・不具合の報告</dt>
          <dd>
            <button
              type="button"
              onClick={onOpenFeedback}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 rounded-full text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
            >
              要望フォームを開く
            </button>
            <p className="text-[11px] text-gray-500 mt-1 leading-snug">
              新機能の提案・不具合の報告など、なんでもお気軽にどうぞ。
            </p>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold text-gray-500 mb-1">ハッシュタグ</dt>
          <dd>
            <a
              href={HASHTAG_URL}
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-semibold text-purple-700 hover:underline"
            >
              #{TWEET_HASHTAG}
            </a>
            <p className="text-[11px] text-gray-500 mt-1 leading-snug">
              投稿の際はこのタグでつぶやいてください。開発者がめっちゃ喜びます。みんなの投稿も見られます。
            </p>
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
      <h2 className="text-lg text-gray-800 mb-3" style={HEADING_FONT_STYLE}>データとプライバシー</h2>

      <dl className="flex flex-col gap-3">
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

/** 最新版の目玉機能カード（紫枠・新機能ページの主役） */
function HighlightCards({ highlights }: { highlights: ReleaseHighlight[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {highlights.map((h) => (
        <li key={h.title} className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
          <p className="text-[11px] font-bold text-purple-700 mb-1">{h.title}</p>
          <p className="text-xs text-gray-700 leading-snug">{h.body}</p>
        </li>
      ))}
    </ul>
  )
}

/** 過去バージョン1件（「これまでのアップデート」内のコンパクト表示） */
function PastReleaseItem({ release }: { release: Release }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-sm font-bold text-gray-800">ver {release.version}</span>
        {release.date && <span className="text-[10px] text-gray-400">{release.date}</span>}
      </div>
      <ul className="flex flex-col gap-1.5">
        {release.highlights.map((h) => (
          <li key={h.title} className="text-xs text-gray-600 leading-snug">
            <span className="font-semibold text-gray-700">{h.title}</span>
            <span className="text-gray-400"> — </span>
            {h.body}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 新機能告知ページ。最新版の目玉を伝えつつ、下に「これまでのアップデート」を畳んで置く。
 * 内容はすべて releases.ts 由来（このコンポーネントは表示のみ）。
 */
function NewsPage() {
  const [showPast, setShowPast] = useState(false)
  const { headline, highlights } = latestRelease
  const past = releases.slice(1)

  return (
    <>
      <span className="inline-flex items-center gap-1.5 bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full mb-2">
        新機能 ver {latestRelease.version}
      </span>
      <h2 className="text-xl text-gray-900 mb-1 tracking-tight" style={CATCH_FONT_STYLE}>
        {headline.lead}
        <span className="text-purple-700">{headline.accent}</span>
        {headline.tail}
      </h2>
      <p className="text-xs text-gray-500 mb-4">前回からのアップデート</p>

      <HighlightCards highlights={highlights} />

      {past.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            aria-expanded={showPast}
          >
            これまでのアップデート（ver {past[0].version} 以前）
            <span className={`transition-transform ${showPast ? 'rotate-180' : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>
          {showPast && (
            <div className="mt-3 flex flex-col gap-4">
              {past.map((r) => (
                <PastReleaseItem key={r.version} release={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const PAGES = [HowToPage, LegendPage, AboutPage, DataPrivacyPage, NewsPage]
const PAGE_COUNT = PAGES.length
// 新機能ページは末尾。再訪ユーザーの自動オープン時はここから開く。
const NEWS_PAGE_INDEX = PAGES.length - 1
const ABOUT_PAGE_INDEX = PAGES.indexOf(AboutPage)

/**
 * 独自スクロールバー付きのスクロール領域。
 * モバイル Safari 等ではネイティブのスクロールバーが消えて「スクロールできると気づけない」ため、
 * 常時見えるサム（つまみ）を自前で重ねる。中身の高さが変わっても（新機能の開閉など）追従する。
 */
const MIN_THUMB = 28 // つまみが小さくなりすぎないための下限(px)
// トラックの上下インセット(px)。上は見出し（タイトル）の下から始める程度、下は角丸ぶん。
const TRACK_INSET_TOP = 64
const TRACK_INSET_BOTTOM = 16

function ScrollArea({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false })
  // ドラッグ開始時のポインタ位置と scrollTop を保持（ドラッグ中の追従に使う）
  const drag = useRef<{ startY: number; startScroll: number } | null>(null)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight + 1) {
      setThumb((t) => (t.visible ? { height: 0, top: 0, visible: false } : t))
      return
    }
    const track = clientHeight - TRACK_INSET_TOP - TRACK_INSET_BOTTOM
    const height = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * track)
    const maxTop = track - height
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop
    setThumb({ height, top, visible: true })
  }, [])

  // スクロール／リサイズ／中身の高さ変化（開閉）に追従
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    // el = ビューポート高さの変化（端末リサイズ）、content = 中身の高さ変化（開閉・ページ切替）に追従
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (contentRef.current) ro.observe(contentRef.current)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  // つまみのドラッグでスクロール（ポインタ移動を scrollTop に換算）
  useEffect(() => {
    function onMove(e: globalThis.PointerEvent) {
      const el = scrollRef.current
      const d = drag.current
      if (!el || !d) return
      const { scrollHeight, clientHeight } = el
      const track = clientHeight - TRACK_INSET_TOP - TRACK_INSET_BOTTOM
      const height = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * track)
      const maxTop = track - height
      if (maxTop <= 0) return
      const perPx = (scrollHeight - clientHeight) / maxTop
      el.scrollTop = d.startScroll + (e.clientY - d.startY) * perPx
    }
    function onUp() {
      drag.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const onThumbDown = (e: ReactPointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    drag.current = { startY: e.clientY, startScroll: el.scrollTop }
    e.preventDefault()
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className="no-native-scrollbar h-full overflow-y-auto px-5 pt-5 pb-2">
        <div ref={contentRef}>{children}</div>
      </div>
      {/* 独自スクロールバー（中身が溢れる時だけ表示）。サイトのテーマ色（紫）に合わせる。
          トラック高さ＝clientHeight に合わせる */}
      {thumb.visible && (
        <div
          className="pointer-events-none absolute right-1 w-1 rounded-full bg-purple-100/70"
          style={{ top: TRACK_INSET_TOP, bottom: TRACK_INSET_BOTTOM }}
        >
          <div
            onPointerDown={onThumbDown}
            className="pointer-events-auto absolute right-0 w-1 rounded-full bg-purple-400/80 hover:bg-purple-500 active:bg-purple-600 transition-colors cursor-grab active:cursor-grabbing touch-none"
            style={{ height: thumb.height, top: thumb.top }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

function OnboardingModal({
  initialPage = 0,
  onClose,
  onOpenFeedback,
}: {
  initialPage?: number
  onClose: () => void
  onOpenFeedback: () => void
}) {
  const [page, setPage] = useState(initialPage)

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        // 高さを全ページで統一（footer=「次へ」の位置が固定され、溢れる分は本文が独自スクロール）。
        // 高さは1枚目（操作案内）がちょうど収まる値に合わせている。短い画面では 85vh で頭打ち。
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full relative h-[500px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="閉じる"
        >
          ✕
        </button>

        {/* 本文（ここだけスクロール・独自スクロールバー付き） */}
        <ScrollArea>
          {(() => {
            if (page === ABOUT_PAGE_INDEX) return <AboutPage onOpenFeedback={onOpenFeedback} />
            const Page = PAGES[page]
            return <Page />
          })()}
        </ScrollArea>

        {/* 固定フッター：ナビゲーション＋ページインジケータ（常に表示） */}
        <div className="shrink-0 px-5 pt-3 pb-4">
          {/* フッターナビゲーション（複数ページのウィザード） */}
          <div className="flex items-center justify-between gap-3">
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

          {/* ページインジケータ（最下部） */}
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: PAGE_COUNT }, (_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? 'bg-gray-800' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [initialPage, setInitialPage] = useState(0)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // localStorage 参照は副作用フェーズ限定（SSR/hydration安全・ちらつき防止・Req6.2）。
  // クライアント専用値で初期表示を決めるため、ハイドレーション後の同期 setState が必須。
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem(STORAGE_KEY)
      const newsSeen = localStorage.getItem(NEWS_SEEN_KEY)
      /* eslint-disable react-hooks/set-state-in-effect -- 上記理由によりハイドレーション後の同期が必要 */
      if (!onboarded) {
        // 初回ユーザー: チュートリアル先頭から（新機能告知は邪魔しない）
        setInitialPage(0)
        setIsOpen(true)
        trackEvent('open_help', { source: 'auto_first_visit', initial_page: 0 })
      } else if (newsSeen !== NEWS_VERSION) {
        // 再訪ユーザー＆新機能が未読: 新機能ページから自動オープン
        setInitialPage(NEWS_PAGE_INDEX)
        setIsOpen(true)
        trackEvent('open_help', { source: 'auto_news', initial_page: NEWS_PAGE_INDEX })
      }
      /* eslint-enable react-hooks/set-state-in-effect */
      // 新機能を既読の再訪ユーザーには自動表示しない（「?」からはいつでも閲覧可）
    } catch {
      // localStorage 不可（プライベートモード等）の場合は自動表示しない
    }
  }, [])

  // 「?」ボタンからの手動表示は常に先頭から
  const openFromHelp = () => {
    setInitialPage(0)
    setIsOpen(true)
    trackEvent('open_help', { source: 'help_button', initial_page: 0 })
  }

  const handleClose = () => {
    setIsOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
      // 現バージョンの新機能を既読として記録（次回からは自動ポップしない）
      localStorage.setItem(NEWS_SEEN_KEY, NEWS_VERSION)
    } catch {
      // 永続化できなくても表示自体は閉じる
    }
  }

  return (
    <>
      <HelpButton onClick={openFromHelp} />
      {isOpen && (
        <OnboardingModal
          initialPage={initialPage}
          onClose={handleClose}
          onOpenFeedback={() => setFeedbackOpen(true)}
        />
      )}
      {feedbackOpen && <FeedbackForm onClose={() => setFeedbackOpen(false)} />}
    </>
  )
}
