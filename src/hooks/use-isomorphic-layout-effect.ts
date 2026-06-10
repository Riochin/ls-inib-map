import { useEffect, useLayoutEffect } from 'react'

/**
 * SSR 安全な useLayoutEffect。
 *
 * `useLayoutEffect` はサーバー側では実行されず React が警告を出すため、
 * サーバー（`window` 不在）では `useEffect` にフォールバックする。
 * クライアントでは描画前に同期実行されるため、初回ペイント前の状態差し替え
 * （例: localStorage からの復元によるちらつき / FOUC 抑制）に使う。
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
