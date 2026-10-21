import { useEffect, useState } from 'react'
import { continueRender, delayRender, staticFile } from 'remotion'
import type { Tap } from './TapIndicator'

/** `pnpm record` が書き出す `public/clips/<clip>.json`。 */
export interface ClipMeta {
  clip: string
  fps: number
  durationInFrames: number
  width: number
  height: number
  storeCount: number | null
  taps: Tap[]
}

/**
 * クリップのメタ情報（長さ・タップ・店舗数）を読み込む。読み込み完了までレンダリングを待たせる。
 */
export function useClipMeta(clip: string): ClipMeta | null {
  const [meta, setMeta] = useState<ClipMeta | null>(null)
  const [handle] = useState(() => delayRender(`clip meta: ${clip}`))

  useEffect(() => {
    let cancelled = false
    fetch(staticFile(`clips/${clip}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`clips/${clip}.json が読めません（先に pnpm record を実行）`)
        return r.json() as Promise<ClipMeta>
      })
      .then((m) => {
        if (cancelled) return
        setMeta(m)
        continueRender(handle)
      })
      .catch((err) => {
        console.error(err)
        continueRender(handle)
      })
    return () => {
      cancelled = true
    }
  }, [clip, handle])

  return meta
}
