import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS } from './theme'
import { HEADING_FONT } from './fonts'

/** テロップ 1 行分。`emphasis` の部分だけ紫にする（例: 「10秒」）。 */
export interface CaptionSegment {
  text: string
  emphasis?: boolean
}

interface CaptionProps {
  /** 行ごとの部分列。 */
  lines: readonly (readonly CaptionSegment[])[]
  /** 文字色（既定は黒）。強調部分は常に紫。 */
  color?: string
  fontSize?: number
  /** 出現開始フレーム（シーン内のローカルフレーム）。 */
  enterAt?: number
  top?: number
}

/**
 * 画面上部のテロップ。下から少し出てフェードインする（派手な動きはつけない）。
 */
export function Caption({ lines, color = COLORS.text, fontSize = 64, enterAt = 0, top = 130 }: CaptionProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const progress = spring({ frame: frame - enterAt, fps, config: { damping: 200, stiffness: 120 } })
  const translateY = interpolate(progress, [0, 1], [28, 0])
  const opacity = interpolate(frame - enterAt, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: HEADING_FONT,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.3,
        color,
        letterSpacing: '-0.01em',
        transform: `translateY(${translateY}px)`,
        opacity,
        padding: '0 60px',
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'nowrap' }}>
          {line.map((seg, j) => (
            <span key={j} style={seg.emphasis ? { color: COLORS.purple } : undefined}>
              {seg.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/** 「A\nB」形式の見出しを Caption 用の行配列にする。 */
export function linesFromText(text: string): CaptionSegment[][] {
  return text.split('\n').map((line) => [{ text: line }])
}
