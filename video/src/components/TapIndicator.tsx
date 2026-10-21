import { interpolate, useCurrentFrame } from 'remotion'
import { COLORS } from './theme'

export interface Tap {
  /** クリップ内のフレーム番号。 */
  frame: number
  /** 画面座標（CSS px・375×812）。 */
  x: number
  y: number
}

interface TapIndicatorProps {
  taps: readonly Tap[]
  /** リングの表示フレーム数。 */
  duration?: number
}

/**
 * タップ位置に広がるリングを出す（撮影スクリプトが記録した座標・時刻を使う）。
 * PhoneFrame の 375×812 座標系の中に置く前提。
 */
export function TapIndicator({ taps, duration = 14 }: TapIndicatorProps) {
  const frame = useCurrentFrame()
  return (
    <>
      {taps.map((tap, i) => {
        const t = frame - tap.frame
        if (t < 0 || t > duration) return null
        const scale = interpolate(t, [0, duration], [0.5, 1.6])
        const opacity = interpolate(t, [0, 2, duration], [0, 0.9, 0], { extrapolateRight: 'clamp' })
        const size = 44
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: tap.x - size / 2,
              top: tap.y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `4px solid ${COLORS.purple}`,
              backgroundColor: 'rgba(123, 47, 190, 0.18)',
              transform: `scale(${scale})`,
              opacity,
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </>
  )
}
