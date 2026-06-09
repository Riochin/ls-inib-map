/**
 * ラスサバ「ペア戦開催日程」の生成物 `pair-schedule.json` の契約型。
 *
 * 公式「ラスサバnet」が毎月告知する来月のペア戦開催日程を、週次のスクレイパが
 * 取得して埋め込み、クライアントのローダ（{@link file://src/data/pair-schedule.ts}）が
 * read-only で公開する。アプリ側はこの日付集合から各日の表示モードを導出する
 * （導出は `src/lib/pair-schedule.ts`）。
 */

/**
 * ある1日の対戦モード。
 * - `pair`: ペア戦（平日でその日が開催日程に記載あり。ペア戦のみ稼働）
 * - `solo`: ソロ戦（平日でその日が開催日程に記載なし）
 * - `both`: ソロ・ペア戦（土日は両モード稼働。記載有無に関わらず週末は both）
 */
export type DayMode = 'pair' | 'solo' | 'both'

/**
 * 1ヶ月分のペア戦開催日程。1件の公式告知（詳細ページ）に対応する。
 */
export interface PairScheduleMonth {
  /** 対象年（西暦・掲載日から推定。年跨ぎ対応） */
  year: number
  /** 対象月（1-12） */
  month: number
  /** ペア戦開催日（ISO `yyyy-mm-dd`・昇順・重複なし） */
  pairDates: string[]
  /** 取得元の詳細ページURL */
  sourceUrl: string
  /** 公式の掲載日（`yyyy-mm-dd`） */
  postedAt: string
  /** スクレイプ取得時刻（ISO 8601）。差分ゲートの比較対象からは除外する */
  fetchedAt: string
}

/**
 * 生成物 `pair-schedule.json` のルート型。
 * 取得済みの月を {@link PairScheduleMonth} 配列で保持し、過去月は非破壊で蓄積する。
 */
export interface PairScheduleFile {
  /** 生成時刻（ISO 8601）。差分ゲートの比較対象からは除外する */
  updatedAt: string
  /** 取得済みの月別日程（(year, month) 昇順） */
  months: PairScheduleMonth[]
}
