import type { MetadataRoute } from 'next'

/**
 * Web アプリマニフェスト。Android/PWA で「ホーム画面に追加」したときの
 * アイコン・名称・テーマ色を定義する（iOS のホーム画面アイコンは apple-icon.png 側）。
 * アイコンは scripts/generate-app-icons.mjs が favicon(icon.svg) から生成したもの。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ラスサバ・イニブ 設置店舗マップ',
    short_name: 'ラストサバイニブ',
    description:
      'ジョジョの奇妙な冒険 ラストサバイバーと機動戦士ガンダム EXTREME VS.2 INFINITEBOOST の設置店舗を地図で検索。',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7B2FBE',
    lang: 'ja',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
