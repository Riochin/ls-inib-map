/**
 * 動画の時間割（フレーム）の単一ソース。シーンの並びと長さはここだけで決める。
 * 30fps・縦 1080×1920・約 24 秒。
 */
export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

/** シーン切り替えのフェード長（フレーム）。 */
export const FADE_FRAMES = Math.round(0.3 * FPS)

/** シーン定義。`clip` は `public/clips/<clip>.mp4` を使うシーン。 */
export const SCENES = [
  { id: 'title', durationInFrames: 3 * FPS },
  { id: 'map', clip: 'map', durationInFrames: 6 * FPS },
  { id: 'filter', clip: 'filter', durationInFrames: 6 * FPS },
  { id: 'detail', clip: 'detail', durationInFrames: 6 * FPS },
  { id: 'end', durationInFrames: 3 * FPS },
] as const

export type SceneId = (typeof SCENES)[number]['id']

/** シーンの開始フレーム。 */
export function sceneStart(id: SceneId): number {
  let from = 0
  for (const scene of SCENES) {
    if (scene.id === id) return from
    from += scene.durationInFrames
  }
  throw new Error(`unknown scene: ${id}`)
}

/** 動画全体のフレーム数。 */
export const TOTAL_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0)
