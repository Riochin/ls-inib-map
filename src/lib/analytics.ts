/**
 * GA4 カスタムイベント計測の中核ラッパー（Issue #59）。
 *
 * 直帰率ではなく「ユーザーが店舗探索・地図機能をどれだけ活用したか」を行動ベースで
 * 計測するためのもの。各コンポーネントは生の gtag ではなく、必ずこの trackEvent
 * 経由でイベントを送る（イベント名・パラメータを型で固定し、タイポと命名ブレを防ぐ）。
 *
 * 送信は GA(gtag.js) がグローバルに生やす `window.gtag('event', ...)` を直接呼ぶ。
 * `@next/third-parties` の `sendGAEvent` はモジュール内部状態（初期化フラグ）に依存して
 * イベントを取りこぼす事例があったため、ページビューと同じ確実な経路に統一している。
 *
 * - イベント名・パラメータは GA4 推奨のスネークケースで統一する。
 * - SSR/ビルド時（window 不在）や GA 未ロード環境（window.gtag 不在＝ローカル/プレビューで
 *   NEXT_PUBLIC_GA_ID 未設定など）では何もしない（no-op）。
 */

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: Record<string, unknown>) => void
  }
}

/** イベント名 → そのイベントが取るパラメータ型のマップ。パラメータ無しは Record<string, never>。 */
export type GAEventMap = {
  /** 店舗ピンクリックで詳細（InfoWindow）が開いた */
  view_store_detail: {
    store_id: string
    store_name?: string
    source: 'marker' | 'deeplink' | 'search'
  }
  /** 「経路を調べる」Google マップリンク押下 */
  click_store_map: { store_id: string; store_name?: string }
  /**
   * エリア絞り込みモーダルで「適用」（既存指標・継続性のため温存）。
   * 全軸を取る {@link GAEventMap.apply_filter} と併走で送り、過去データと比較可能にする。
   */
  select_prefecture: { prefecture: string; city_count: number }
  /**
   * 絞り込みモーダルで「適用」時の全条件サマリー（ver2.4〜）。どの軸が使われるか・
   * 結果件数の分布を1イベントで把握する。`select_prefecture` と同時に送る。
   */
  apply_filter: {
    game: string
    region: string
    prefecture_count: number
    city_count: number
    min_machines: number
    has_streaming: boolean
    has_recording: boolean
    has_smoking: boolean
    open_only: boolean
    completeness: string
    result_count: number
    is_filtered: boolean
  }
  /** タイトルタブ切替（すべて/ラスサバ/イニブ） */
  filter_title: { filter: string }
  /** 現在地ボタン押下 */
  click_geolocation_search: Record<string, never>
  /** 店舗共有ボタン押下 */
  share_store: { store_id: string; method: 'web_share' | 'clipboard' }
  /** 「店舗公式サイト」リンク押下 */
  click_official_site: { store_id: string }
  /** 情報提供フォーム送信成功 */
  submit_store_info: { store_id: string; has_correction: boolean }
  /** 検索結果から店舗を選択 */
  select_search_result: { store_id: string }
  /** ヘルプ（オンボーディング）モーダル展開 */
  open_help: {
    source: 'help_button' | 'auto_first_visit' | 'auto_news'
    initial_page: number
  }
  /** 要望フォーム送信成功 */
  submit_feedback: Record<string, never>
}

export type GAEventName = keyof GAEventMap

/** パラメータ無しイベントは引数省略、それ以外はパラメータ必須にする可変長タプル。 */
type EventArgs<E extends GAEventName> = GAEventMap[E] extends Record<string, never>
  ? []
  : [params: GAEventMap[E]]

/**
 * GA4 へカスタムイベントを送信する。型に合わないイベント名/パラメータはコンパイルエラーになる。
 *
 * @example
 *   trackEvent('filter_title', { filter: 'jojo-ls' })
 *   trackEvent('click_geolocation_search')
 */
export function trackEvent<E extends GAEventName>(name: E, ...args: EventArgs<E>): void {
  // SSR/ビルド時は送信しない。
  if (typeof window === 'undefined') return
  // GA(gtag.js) 未ロード環境（ローカル/プレビューで GA 無効など）では no-op。
  if (typeof window.gtag !== 'function') return
  const params = (args[0] ?? {}) as Record<string, unknown>
  window.gtag('event', name, params)
}
