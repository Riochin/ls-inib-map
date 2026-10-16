import { Composition } from 'remotion'
import { AppDemo } from './AppDemo'
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './timeline'

/** Remotion のルート。書き出し対象の Composition は `AppDemo` の 1 本。 */
export function RemotionRoot() {
  return (
    <Composition
      id="AppDemo"
      component={AppDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  )
}
