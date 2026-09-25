import { AbsoluteFill, Freeze, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion'
import { Caption, type CaptionSegment } from '../components/Caption'
import { PhoneFrame } from '../components/PhoneFrame'
import { TapIndicator } from '../components/TapIndicator'
import { useClipMeta } from '../components/clipMeta'
import { COLORS, PHONE_TOP, SCREEN } from '../components/theme'

interface ClipSceneProps {
  /** `public/clips/<clip>.mp4` の名前。 */
  clip: string
  /** テロップ（店舗数など撮影時の値を使うため、メタ情報を受け取って組み立てる）。 */
  caption: (storeCount: number | null) => readonly (readonly CaptionSegment[])[]
}

/**
 * シーン 1〜3: 実操作クリップをスマホ枠に入れ、上にテロップ、画面内にタップ表示を重ねる。
 * クリップがシーンより短いときは最後のフレームで止める（Freeze）。
 */
export function ClipScene({ clip, caption }: ClipSceneProps) {
  const frame = useCurrentFrame()
  const meta = useClipMeta(clip)
  const video = (
    <OffthreadVideo
      src={staticFile(`clips/${clip}.mp4`)}
      style={{ width: SCREEN.width, height: SCREEN.height, display: 'block', objectFit: 'cover' }}
      muted
    />
  )
  const lastFrame = meta ? Math.max(0, meta.durationInFrames - 1) : null
  const frozen = lastFrame !== null && frame >= lastFrame

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      <Caption lines={caption(meta?.storeCount ?? null)} color={COLORS.purple} enterAt={4} />
      <div style={{ position: 'absolute', top: PHONE_TOP, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <PhoneFrame>
          {frozen ? <Freeze frame={lastFrame}>{video}</Freeze> : video}
          {meta ? <TapIndicator taps={meta.taps} /> : null}
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  )
}
