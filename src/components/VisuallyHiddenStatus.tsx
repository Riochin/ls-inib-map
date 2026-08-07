/**
 * スクリーンリーダー向けに動的な状態変化を読み上げる、視覚的には非表示のライブリージョン。
 * 要素自体は常にマウントしテキストだけ差し替えること（マウント/アンマウントを繰り返すと
 * 一部のスクリーンリーダーで読み上げが安定しないため）。
 */
export function VisuallyHiddenStatus({ message }: { message: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {message}
    </p>
  )
}
