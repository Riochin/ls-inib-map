'use client'

import { dayModeLabel, type PairScheduleDay, type PairScheduleView } from '@/lib/pair-schedule'
import type { DayMode } from '@/types/pair-schedule'

/**
 * ペア戦開催日程の「中身」だけを描画する再利用コンポーネント。
 *
 * 開閉チップ（{@link file://src/components/PairSchedulePanel.tsx}）と管理プレビュー
 * （/admin/overrides）の両方から使う。外枠（パディング・枠線・背景）は呼び出し側が付ける。
 */

/** ラスサバのテーマカラー（紫） */
export const PAIR_PURPLE = '#7B2FBE'

/** 曜日の漢字（0=日〜6=土） */
const WEEKDAY_KANJI = ['日', '月', '火', '水', '木', '金', '土']

/** 曜日の文字色（日=赤・土=青・平日=グレー） */
function weekdayColor(weekday: number): string {
  if (weekday === 0) return 'text-red-500'
  if (weekday === 6) return 'text-blue-500'
  return 'text-gray-500'
}

/** モードの代表色（ペア・ソロペアは紫／ソロは控えめなグレー／未公開は薄グレー） */
export function modeColor(mode: DayMode | null): string {
  if (mode === 'solo') return '#4B5563'
  if (mode) return PAIR_PURPLE
  return '#9CA3AF'
}

/** モードバッジ（ペア＝紫塗り／ソロ・ペア＝紫枠／ソロ＝グレー） */
function ModeBadge({ mode }: { mode: DayMode }) {
  const base = 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap'
  if (mode === 'pair') {
    return (
      <span className={base} style={{ backgroundColor: PAIR_PURPLE, color: '#fff' }}>
        {dayModeLabel(mode)}
      </span>
    )
  }
  if (mode === 'both') {
    return (
      <span
        className={base}
        style={{ backgroundColor: '#F3E8FF', color: PAIR_PURPLE, border: `1px solid ${PAIR_PURPLE}` }}
      >
        {dayModeLabel(mode)}
      </span>
    )
  }
  return <span className={`${base} bg-gray-100 text-gray-500`}>{dayModeLabel(mode)}</span>
}

/** 当月の日別一覧の1行 */
function DayRow({ day }: { day: PairScheduleDay }) {
  const weekend = day.weekday === 0 || day.weekday === 6
  return (
    <li
      className={`flex items-center justify-between gap-2 px-2 py-0.5 rounded-md ${
        weekend ? 'bg-gray-50' : ''
      } ${day.isToday ? 'ring-1 ring-purple-400' : ''}`}
    >
      <span className="flex items-baseline gap-1">
        <span className={`text-xs tabular-nums ${day.isToday ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
          {day.day}日
        </span>
        <span className={`text-[10px] ${weekdayColor(day.weekday)}`}>
          ({WEEKDAY_KANJI[day.weekday]})
        </span>
        {day.isToday && (
          <span className="text-[10px] font-bold" style={{ color: PAIR_PURPLE }}>
            今日
          </span>
        )}
      </span>
      <ModeBadge mode={day.mode} />
    </li>
  )
}

/**
 * 当月のペア戦開催日程の中身（見出し・凡例・日別一覧・出典）。
 * 当月の日程が未公開なら親切なフォールバックを表示する。外枠は呼び出し側が付ける。
 */
export function PairScheduleContent({ view }: { view: PairScheduleView }) {
  if (!view.hasCurrentMonth || !view.month) {
    return (
      <div className="py-1 text-center">
        <p className="text-xs text-gray-700 leading-snug">
          今月（{view.todayMonth}月）のペア戦日程は
          <br />
          まだ公開されていません。
        </p>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">
          公式で発表されると自動で表示されます。
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h2 className="text-xs font-bold" style={{ color: PAIR_PURPLE }}>
          {view.month.month}月のペア戦開催日程
        </h2>
      </div>
      <p className="text-[10px] text-gray-400 leading-snug mb-1.5">
        記載日＝ペア戦／土日はソロ・ペア戦／ほかはソロ戦
      </p>
      <ul className="flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto">
        {view.days.map((day) => (
          <DayRow key={day.iso} day={day} />
        ))}
      </ul>
      <p className="text-[10px] text-gray-400 mt-2 leading-snug">
        {view.month.postedAt} 公式発表 ・ 出典{' '}
        <a
          href={view.month.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-700 hover:underline"
        >
          ラスサバnet
        </a>
      </p>
    </>
  )
}
