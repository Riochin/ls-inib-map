import type { GameTitle } from '@/types/store'
import { getCountBadgeStyle, getGameLabel, type ColorTheme } from '@/lib/marker-color'

/**
 * 台数バッジ（「ラスサバ 4台」等）。地図のInfoWindowと管理プレビューで共有する。
 *
 * - 配色は確からしさで出し分け（確定＝メインカラー＋白／未確認＝薄い背景＋メインカラー文字）。
 * - `onClick` を渡すとボタン（タップで出どころ表示などに使う）、無ければ静的表示。
 */
export function CountBadge({
  game,
  count,
  theme,
  confirmed,
  onClick,
  title,
}: {
  game: GameTitle
  count?: number
  theme: ColorTheme
  confirmed: boolean
  onClick?: () => void
  title?: string
}) {
  const className = `text-xs px-2 py-0.5 rounded-full${onClick ? ' cursor-pointer' : ''}`
  const style = getCountBadgeStyle(theme, confirmed)
  const label = `${getGameLabel(game)}${count != null ? ` ${count}台` : ''}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={className} style={style}>
        {label}
      </button>
    )
  }
  return (
    <span title={title} className={className} style={style}>
      {label}
    </span>
  )
}
