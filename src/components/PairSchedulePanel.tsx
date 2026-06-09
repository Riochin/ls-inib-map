'use client'

import { useMemo, useState } from 'react'
import { pairSchedule } from '@/data/pair-schedule'
import { buildPairScheduleView, dayModeLabel } from '@/lib/pair-schedule'
import { PairScheduleContent, modeColor } from './PairScheduleContent'

interface PairSchedulePanelProps {
  /** 「今日」として扱う時刻。未指定なら現在時刻（管理プレビューで任意日付を注入できる） */
  now?: Date
  /** 展開時の幅クラス。既定は地図用（左右16px等マージンで画面幅いっぱい） */
  expandedWidthClassName?: string
  /** 見出しラベル。既定「今日」。プレビューで対象日付に差し替え可能 */
  headLabel?: string
}

/**
 * ラスサバの「ペア戦／ソロ戦」案内チップ。
 *
 * 地図では左上の件数・最終更新カードの下に、同じ見た目・サイズで折りたたみ表示する。畳んだ
 * 状態は今日の対戦モード（例「ソロ戦」）だけを示すコンパクトなチップ。タップで横に広がり、
 * 当月の日別一覧を表示する。表示の中身は {@link PairScheduleContent} に切り出し共有する。
 *
 * `now`/`expandedWidthClassName`/`headLabel` を注入することで、管理プレビュー（任意日付・枠内幅）
 * でも同じ開閉チップを再利用する。対象ユーザーがノンテック層のため平易な日本語でアイコンは控えめ。
 */
export function PairSchedulePanel({
  now,
  expandedWidthClassName = 'w-[calc(100vw-2rem)]',
  headLabel = '今日',
}: PairSchedulePanelProps = {}) {
  const view = useMemo(() => buildPairScheduleView(pairSchedule, now ?? new Date()), [now])
  const [expanded, setExpanded] = useState(false)

  // 畳んだ状態の見出し: 対象日のモード（未公開時は注意喚起）
  const collapsedLabel = view.todayMode ? dayModeLabel(view.todayMode) : '日程は未公開'

  return (
    <div
      // 畳んだ状態は常に内容幅の小さなチップ（w-fit で親に依存せず縮む）。展開時は地図では
      // 左端（件数カードと同じ left-4=16px）を保ったまま幅を calc(100vw - 2rem) にし、左右
      // マージンを等しく（各16px）して画面幅いっぱいに広げる（管理画面では枠内の w-full）。
      className={`bg-white/85 backdrop-blur-sm rounded-xl shadow overflow-hidden ${
        expanded ? expandedWidthClassName : 'w-fit'
      }`}
    >
      {/* ヘッダー行（タップで開閉）。畳んだ状態は今日のモードだけのコンパクトなチップ */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 active:bg-white/60 transition-colors"
      >
        {/* 畳んだ表示はモード色に統一（ペア戦の日はメインカラーの紫でチップ全体が目立つ） */}
        <span className="text-[10px] shrink-0" style={{ color: modeColor(view.todayMode) }}>
          {headLabel}
        </span>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color: modeColor(view.todayMode) }}>
          {collapsedLabel}
        </span>
        <span
          className={`ml-auto pl-1 text-gray-400 text-[10px] transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {/* 展開部: 当月の日別一覧（中身は共有コンポーネント） */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-2.5">
          <PairScheduleContent view={view} />
        </div>
      )}
    </div>
  )
}
