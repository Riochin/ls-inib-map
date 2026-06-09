import type { Metadata, Viewport } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { SeoContent } from '@/components/SeoContent'
import './globals.css'

const SITE_URL = 'https://ls-inib-map.vercel.app'
const SITE_NAME = 'ラスサバ・イニブ 設置店舗マップ'
const DESCRIPTION =
  'ジョジョの奇妙な冒険 ラストサバイバー（ラスサバ）と機動戦士ガンダム EXTREME VS.2 INFINITEBOOST（イニブ）の設置店舗を、全国47都道府県・約760店舗から地図で検索。公式サイトから自動更新しています。'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ラスサバ・イニブ 設置店舗マップ｜全国のゲームセンターを地図で検索',
    template: '%s｜ラスサバ・イニブ 設置店舗マップ',
  },
  description: DESCRIPTION,
  keywords: [
    'ラスサバ',
    'ラストサバイバー',
    'ジョジョの奇妙な冒険 ラストサバイバー',
    'イニブ',
    '機動戦士ガンダム EXTREME VS.2 INFINITEBOOST',
    'ガンダム EXVS2',
    '設置店舗',
    '設置店',
    '筐体',
    'ゲームセンター',
    'マップ',
    '地図検索',
    'ラストサバイニブ',
  ],
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'thDPYfsByvt8fIWF72-54d59tsSdBF-oPTsN41Yp5Vs',
  },
  openGraph: {
    title: SITE_NAME,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DESCRIPTION,
  },
}

/**
 * 構造化データ（JSON-LD）。サイト自体を表す WebApplication として宣言し、
 * リッチリザルト/サイトリンク等の対象になりやすくする。店舗（第三者施設・個別ページ無し）の
 * LocalBusiness 化はガイドライン上のリスクがあるため意図的に含めない。
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: 'ReferenceApplication',
  operatingSystem: 'Web',
  inLanguage: 'ja',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
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
  return (
    <html lang="ja">
      <head>
        {/*
          オンボーディングの見出し系に使う表示用フォント（M PLUS Rounded 1c / 丸ゴシック）。
          キャッチフレーズは 700、各セクション見出しは 500。
          固定文言（戦場選びを、サクッと10秒に。／ピンの見かた／台数の見かた／
          このアプリについて／データとプライバシー／その台数、「信じていい？」がわかる。）の使用文字のみを &text= でサブセットし、
          数KBに絞って読み込む。本文・UI はシステムフォントのまま。
          ※見出しの文言を変更したら、この &text= も合わせて更新すること。
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700&text=%E6%88%A6%E5%A0%B4%E9%81%B8%E3%81%B3%E3%82%92%E3%80%81%E3%82%B5%E3%82%AF%E3%83%83%E3%81%A810%E7%A7%92%E3%81%AB%E3%80%82%E3%83%94%E3%83%B3%E3%81%AE%E8%A6%8B%E3%81%8B%E3%81%9F%E5%8F%B0%E6%95%B0%E3%81%AE%E8%A6%8B%E3%81%8B%E3%81%9F%E3%81%93%E3%81%AE%E3%82%A2%E3%83%97%E3%83%AA%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E3%83%87%E3%83%BC%E3%82%BF%E3%81%A8%E3%83%97%E3%83%A9%E3%82%A4%E3%83%90%E3%82%B7%E3%83%BC%E3%81%9D%E3%81%AE%E5%8F%B0%E6%95%B0%E3%80%81%E3%80%8C%E4%BF%A1%E3%81%98%E3%81%A6%E3%81%84%E3%81%84%EF%BC%9F%E3%80%8D%E3%81%8C%E3%82%8F%E3%81%8B%E3%82%8B%E3%80%82&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SeoContent />
        {children}
      </body>
      <GoogleAnalytics gaId="G-9VVXLS9KMZ" />
    </html>
  )
}
