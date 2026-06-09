import type { DayMode, PairScheduleFile, PairScheduleMonth } from '@/types/pair-schedule'

/**
 * ペア戦開催日程から「各日の対戦モード」を導出する純関数群（UIの表示ロジック）。
 *
 * 判定ルール（公式の運用）:
 * - 土日 → `both`（ソロ・ペア戦。週末は両モード稼働。開催日程に載っていても both）
 * - 平日で開催日程に記載あり → `pair`（ペア戦のみ）
 * - 平日で記載なし → `solo`（ソロ戦）
 *
 * 「今日」は日本のサービスのため常に JST 固定で算出する。`now`（現在時刻）は呼び出し側が
 * 注入し、本モジュールは内部で `new Date()` を呼ばない（テストで固定日を注入可能にする）。
 */

/** JST での年月日（サーバのタイムゾーンに依存しない） */
export interface JstYmd {
  year: number
  month: number // 1-12
  day: number
  /** `yyyy-mm-dd` */
  iso: string
}

/**
 * 任意の時刻 `now` を JST の年月日へ変換する。
 * `Intl.DateTimeFormat` に `Asia/Tokyo` を明示することで、サーバ（UTC）でもクライアント
 * （閲覧者ローカル）でも同じ「今日」を得る（UTC深夜跨ぎのズレを防ぐ）。
 */
export function toJstYmd(now: Date): JstYmd {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  return { year, month, day, iso: `${get('year')}-${get('month')}-${get('day')}` }
}

/**
 * `yyyy-mm-dd` の曜日（0=日〜6=土）。UTC正午で生成し、タイムゾーンによる前後ズレを避ける。
 */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

/** 土日か */
export function isWeekend(iso: string): boolean {
  const w = isoWeekday(iso)
  return w === 0 || w === 6
}

/** その月の日数 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * 1日分の対戦モードを導出する。
 * 週末は記載有無に関わらず `both`（ルール優先）。平日は記載あり→`pair`/なし→`solo`。
 */
export function dayMode(iso: string, pairDates: ReadonlySet<string>): DayMode {
  if (isWeekend(iso)) return 'both'
  return pairDates.has(iso) ? 'pair' : 'solo'
}

/** 表示用の1日分 */
export interface PairScheduleDay {
  /** `yyyy-mm-dd` */
  iso: string
  /** 日（1-31） */
  day: number
  /** 曜日（0=日〜6=土） */
  weekday: number
  /** 対戦モード */
  mode: DayMode
  /** 今日か */
  isToday: boolean
}

/** UIに渡す導出済みビュー */
export interface PairScheduleView {
  /** 今日（JST）の `yyyy-mm-dd` */
  todayIso: string
  /** 今日の月（1-12） */
  todayMonth: number
  /** 今日の日（1-31） */
  todayDay: number
  /** 今日の対戦モード。当月の日程が未公開なら null */
  todayMode: DayMode | null
  /** 当月の日程データが存在するか */
  hasCurrentMonth: boolean
  /** 当月の日程（未公開なら null） */
  month: PairScheduleMonth | null
  /** 当月の日別一覧（未公開なら空配列） */
  days: PairScheduleDay[]
}

/**
 * 日程ファイルと現在時刻から、今日のモードと当月の日別一覧を導出する。
 * 当月の日程が未公開（該当月なし）の場合は `todayMode=null` / `hasCurrentMonth=false` を返し、
 * UI 側で「日程は未公開」フォールバックを表示できるようにする。
 */
export function buildPairScheduleView(file: PairScheduleFile, now: Date): PairScheduleView {
  const today = toJstYmd(now)
  const month =
    file.months.find((m) => m.year === today.year && m.month === today.month) ?? null

  if (!month) {
    return {
      todayIso: today.iso,
      todayMonth: today.month,
      todayDay: today.day,
      todayMode: null,
      hasCurrentMonth: false,
      month: null,
      days: [],
    }
  }

  const pairSet = new Set(month.pairDates)
  const total = daysInMonth(month.year, month.month)
  const days: PairScheduleDay[] = []
  for (let d = 1; d <= total; d++) {
    const iso = `${month.year}-${String(month.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      iso,
      day: d,
      weekday: isoWeekday(iso),
      mode: dayMode(iso, pairSet),
      isToday: iso === today.iso,
    })
  }

  return {
    todayIso: today.iso,
    todayMonth: today.month,
    todayDay: today.day,
    todayMode: dayMode(today.iso, pairSet),
    hasCurrentMonth: true,
    month,
    days,
  }
}

/** 対戦モードの表示ラベル（ノンテック層向けの平易な日本語） */
export function dayModeLabel(mode: DayMode): string {
  switch (mode) {
    case 'pair':
      return 'ペア戦'
    case 'solo':
      return 'ソロ戦'
    case 'both':
      return 'ソロ・ペア戦'
  }
}
