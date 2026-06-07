import type { Metadata, Viewport } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'ラスサバ・イニブ 設置店舗マップ',
  description: 'ジョジョの奇妙な冒険ラストサバイバー・機動戦士ガンダムEXVS2の設置店舗を地図で検索',
  openGraph: {
    title: 'ラスサバ・イニブ 設置店舗マップ',
    description: 'ジョジョの奇妙な冒険ラストサバイバー・機動戦士ガンダムEXVS2の設置店舗を地図で検索',
    siteName: 'ラスサバ・イニブ 設置店舗マップ',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="ja">
      <body>{children}</body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  )
}
