import * as Sentry from '@sentry/nextjs'

/**
 * Sentryクライアント初期化（ブラウザのみ）。Next.js が自動で読み込む規約ファイル。
 * サーバー/エッジは対象外（Issue #244 の要望範囲：クライアント側の例外監視のみ）。
 *
 * DSN 未設定（ローカル/プレビュー等）では初期化をスキップし、GA4 と同様に誤計測・
 * 不要な通信を防ぐ（{@link file://./lib/site-config.ts} の運用方針を踏襲）。
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // ユーザーIP等のデフォルトPII送信を無効化（明示的にオプトインしない限り送らない）。
    sendDefaultPii: false,
    // エラーは取りこぼしなく全件、パフォーマンストレースは低頻度サンプリング。
    tracesSampleRate: 0.1,
    // 通常セッションも1割程度サンプリングし、エラー発生時は高確率で記録。
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      // maskAllText / blockAllMedia / maskAllInputs はデフォルト true。
      // 明示オーバーライドはせず、フォーム入力等が写らない状態を維持する。
      Sentry.replayIntegration(),
    ],
    beforeSend(event) {
      // sendDefaultPii=false でも念のための二重防御として user 情報を除去。
      if (event.user) {
        delete event.user
      }
      return event
    },
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
