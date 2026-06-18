/**
 * 表示用フォント（M PLUS Rounded 1c / 丸ゴシック）の見出しスタイル。
 *
 * オンボーディングと送信フォーム等のモーダル見出しで共有し、トーンを揃える。
 * フォント本体は `src/app/layout.tsx` で **使用文字のみ** を `&text=` サブセット読み込みするため、
 * このスタイルを当てる見出し文言を増やしたら layout.tsx の `&text=` にも文字を追加すること。
 *
 * ⚠️ 店名など **任意・動的な文字列には使わない**こと。サブセットに含められない文字が
 * フォールバック（システムフォント）になり、文字ごとに太さがばらついて見える。
 * 動的テキストはシステムフォント（`font-bold` 等）で表示する。
 */
export const HEADING_FONT_STYLE = {
  fontFamily: "'M PLUS Rounded 1c', sans-serif",
  fontWeight: 500,
} as const

/** キャッチコピー用（太め 700）。 */
export const CATCH_FONT_STYLE = {
  fontFamily: "'M PLUS Rounded 1c', sans-serif",
  fontWeight: 700,
} as const
