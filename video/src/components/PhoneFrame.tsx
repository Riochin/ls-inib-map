import type { CSSProperties, ReactNode } from 'react'
import { BEZEL, COLORS, PHONE_SCALE, SCREEN, SCREEN_RADIUS } from './theme'

interface PhoneFrameProps {
  /** 画面の中身（クリップ映像や画像）。375×812 の画面座標で描いたものが `scale` 倍で表示される。 */
  children: ReactNode
  /** 画面の表示倍率（既定は PHONE_SCALE）。 */
  scale?: number
  style?: CSSProperties
}

/**
 * LP の `PhoneFrame` と同じ見た目（濃いグレーのベゼル・角丸）のスマホ枠。
 * 中身は 375×812 の座標系で置き、枠ごと `scale` 倍にする（タップ表示の座標計算を簡単にするため）。
 */
export function PhoneFrame({ children, scale = PHONE_SCALE, style }: PhoneFrameProps) {
  const width = SCREEN.width * scale + BEZEL * 2
  const height = SCREEN.height * scale + BEZEL * 2
  return (
    <div
      style={{
        width,
        height,
        borderRadius: SCREEN_RADIUS + BEZEL,
        backgroundColor: COLORS.bezel,
        boxShadow: '0 40px 80px rgba(17, 24, 39, 0.25)',
        padding: BEZEL,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          width: SCREEN.width * scale,
          height: SCREEN.height * scale,
          borderRadius: SCREEN_RADIUS,
          overflow: 'hidden',
          backgroundColor: COLORS.white,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: SCREEN.width,
            height: SCREEN.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
