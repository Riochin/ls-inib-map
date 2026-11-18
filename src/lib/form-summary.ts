import type { GameTitle, TernaryState } from '@/types/store'
import { getGameLabel } from '@/lib/marker-color'

/**
 * 提供フォームの折りたたみ見出しに出す要約文（ADR-0004）。空文字は「未入力」として表示される。
 */

/** 決済・電子マネー: 「3件選択」。未選択は空文字 */
export function summarizePayments(payments: readonly string[]): string {
  return payments.length > 0 ? `${payments.length}件選択` : ''
}

/**
 * 店のサービス: 項目ごとに「クレジットサービス あり」「貸切 あり（イニブ）」「貸切 なし」「貸切 不明」を
 * 「・」でつなぐ。全ゲームあり→「あり」、一部のゲームだけあり→「あり（ゲーム名）」、入力が全部なし→「なし」、
 * それ以外（不明を含む）→「不明」。入力の無い項目は出さない。
 */
export function summarizeServices(
  games: readonly GameTitle[],
  services: readonly { label: string; values: Partial<Record<GameTitle, TernaryState | ''>> }[],
): string {
  return services
    .map(({ label, values }) => {
      const entered = games.filter((game) => values[game])
      if (entered.length === 0) return ''
      const yes = entered.filter((game) => values[game] === 'yes')
      if (yes.length === games.length) return `${label} あり`
      if (yes.length > 0) return `${label} あり（${yes.map(getGameLabel).join('・')}）`
      return entered.every((game) => values[game] === 'no') ? `${label} なし` : `${label} 不明`
    })
    .filter(Boolean)
    .join('・')
}
