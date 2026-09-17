import path from 'node:path'
import { Config } from '@remotion/cli/config'

/**
 * Remotion の設定。
 * - `@` をアプリ本体の `src/` に向け、LP の文言（`@/lib/about-copy`）を単一ソースのまま使う
 * - 出力は H.264 MP4（X 投稿向け）
 */
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      '@': path.resolve(process.cwd(), '../src'),
    },
  },
}))
Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
