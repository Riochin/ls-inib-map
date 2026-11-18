import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { ABOUT_CATCHPHRASE_LINES } from '@/lib/about-copy'
import { Caption } from '../components/Caption'
import { PhoneFrame } from '../components/PhoneFrame'
import { BODY_FONT } from '../components/fonts'
import { COLORS, SCREEN } from '../components/theme'

const SITE_NAME = 'ラスサバ・イニブ 設置店舗マップ'
/** タイトルシーンはテロップが 2 行＋サイト名なので、スマホ枠を少し小さくして下に置く。 */
const TITLE_PHONE_SCALE = 1.6
const TITLE_PHONE_TOP = 470

/**
 * シーン 0: 白背景に見出し「戦場選びを／サクッと10秒に。」（黒、「10秒」だけ紫）とサイト名。
 * 下から LP のヒーロー画像（日本全体の地図）を入れたスマホ枠がせり上がる。
 */
export function TitleScene() {
  const frame = useCurrentFrame()
  const { fps, height } = useVideoConfig()
  const rise = spring({ frame: frame - 6, fps, config: { damping: 200, stiffness: 90 } })
  const phoneTop = interpolate(rise, [0, 1], [height, TITLE_PHONE_TOP])

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      <Caption lines={ABOUT_CATCHPHRASE_LINES} fontSize={92} top={120} />
      <div
        style={{
          position: 'absolute',
          top: 385,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: BODY_FONT,
          fontSize: 34,
          color: COLORS.muted,
          opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {SITE_NAME}
      </div>
      <div style={{ position: 'absolute', top: phoneTop, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <PhoneFrame scale={TITLE_PHONE_SCALE}>
          <Img src={staticFile('assets/hero-map.webp')} style={{ width: SCREEN.width, height: SCREEN.height, display: 'block' }} />
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  )
}
