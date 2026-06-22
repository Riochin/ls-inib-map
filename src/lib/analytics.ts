import { sendGAEvent } from '@next/third-parties/google'

/**
 * GA4 カスタムイベント計測の中核ラッパー（Issue #59）。
 *
 * 直帰率ではなく「ユーザーが店舗探索・地図機能をどれだけ活用したか」を行動ベースで
 * 計測するためのもの。各コンポーネントは生の sendGAEvent ではなく、必ずこの trackEvent
 * 経由でイベントを送る（イベント名・パラメータを型で固定し、タイポと命名ブレを防ぐ）。
 *
 * - イベント名・パラメータは GA4 推奨のスネークケースで統一する。
 * - SSR/ビルド時（window 不在）や NEXT_PUBLIC_GA_ID 未設定環境（ローカル/プレビュー）では
 *   何もしない（no-op）。これにより開発時の誤計測を防ぐ。
 */

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
  /** エリア絞り込みモーダルで「適用」 */
  select_prefecture: { prefecture: string; city_count: number }
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
  // SSR/ビルド時、または GA 未設定環境（ローカル/プレビュー）では送信しない。
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_GA_ID) return
  const params = (args[0] ?? {}) as Record<string, unknown>
  sendGAEvent('event', name, params)
}
