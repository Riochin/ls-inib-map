import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { SITE_URL, TWEET_HASHTAG } from '@/lib/site-config'
import { BODY_FONT, HEADING_FONT } from '../components/fonts'
import { COLORS } from '../components/theme'

/** シーン 4: OGP のキービジュアルと URL・ハッシュタグ。 */
export function EndScene() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 200, stiffness: 110 } })
  const host = SITE_URL.replace(/^https?:\/\//, '')

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.purpleSoft, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 960, transform: `scale(${interpolate(pop, [0, 1], [0.94, 1])})`, borderRadius: 32, overflow: 'hidden', boxShadow: '0 30px 70px rgba(123, 47, 190, 0.25)' }}>
        <Img src={staticFile('assets/ogp.png')} style={{ width: 960, display: 'block' }} />
      </div>
      <div
        style={{
          marginTop: 90,
          fontFamily: HEADING_FONT,
          fontWeight: 700,
          fontSize: 96,
          color: COLORS.text,
          letterSpacing: '-0.01em',
          opacity: interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {host}
      </div>
      <div
        style={{
          marginTop: 24,
          fontFamily: BODY_FONT,
          fontWeight: 700,
          fontSize: 48,
          color: COLORS.purple,
          opacity: interpolate(frame, [12, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        #{TWEET_HASHTAG}
      </div>
    </AbsoluteFill>
  )
}
