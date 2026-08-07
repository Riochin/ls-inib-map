'use client'

import { useEffect, useRef, type RefObject } from 'react'

export interface UseModalA11yOptions {
  /** Escape 押下時に呼ぶ（モーダルを閉じる）。 */
  onClose: () => void
}

/** Escape キー押下かどうかの判定（テスト用に分離した純関数）。 */
export function isEscapeKey(e: Pick<KeyboardEvent, 'key'>): boolean {
  return e.key === 'Escape'
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'

/**
 * モーダル/ダイアログ共通のふるまい（マウント時の初期フォーカス移動・Tabキーの
 * フォーカストラップ・Escapeキーでの onClose 呼び出し）を付与するフック。
 * role="dialog" / aria-modal / aria-labelledby 等のJSX属性は各コンポーネント側の
 * 記述のまま残し、このフックは書き換えない。戻り値の ref をダイアログ要素の
 * `ref` にそのまま渡すだけで導入できる。ダイアログ要素には `tabIndex={-1}` を
 * 付けておくと、内部にフォーカス可能要素が無い場合のフォールバック先になる。
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  onClose,
}: UseModalA11yOptions): RefObject<T | null> {
  const dialogRef = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.tabIndex !== -1)
    ;(focusable()[0] ?? dialog).focus()

    function handleKeydown(e: KeyboardEvent) {
      if (isEscapeKey(e)) {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const els = focusable()
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', handleKeydown)
    return () => {
      dialog.removeEventListener('keydown', handleKeydown)
      previouslyFocused?.focus?.()
    }
  }, [])

  return dialogRef
}
