import type { ReactNode } from 'react'
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { aboutFeatures } from '@/lib/about-copy'
import { linesFromText } from './components/Caption'
import { COLORS } from './components/theme'
import { ClipScene } from './scenes/ClipScene'
import { EndScene } from './scenes/EndScene'
import { TitleScene } from './scenes/TitleScene'
import { FADE_FRAMES, SCENES, sceneStart } from './timeline'

/** シーンの最初と最後を短くフェードさせる（白背景の上で切り替える）。 */
function SceneFade({ durationInFrames, children }: { durationInFrames: number; children: ReactNode }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

/** 嬉しいポイントの見出し（LP と同じ文言）。店舗数は撮影時の値を使い、無ければ LP と同じ「全国◯店舗」を数字なしで避けて「全国の店舗」にする。 */
function featureCaption(index: number) {
  return (storeCount: number | null) => {
    const title = aboutFeatures(storeCount ?? 0)[index].title
    return linesFromText(storeCount === null ? title.replace('全国0店舗', '全国の店舗') : title)
  }
}

/** 本体: 時間割（timeline.ts）どおりにシーンを並べる。 */
export function AppDemo() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.white }}>
      {SCENES.map((scene) => (
        <Sequence key={scene.id} from={sceneStart(scene.id)} durationInFrames={scene.durationInFrames} name={scene.id}>
          <SceneFade durationInFrames={scene.durationInFrames}>
            {scene.id === 'title' ? <TitleScene /> : null}
            {scene.id === 'map' ? <ClipScene clip="map" caption={featureCaption(0)} /> : null}
            {scene.id === 'filter' ? <ClipScene clip="filter" caption={featureCaption(1)} /> : null}
            {scene.id === 'detail' ? <ClipScene clip="detail" caption={featureCaption(2)} /> : null}
            {scene.id === 'end' ? <EndScene /> : null}
          </SceneFade>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
