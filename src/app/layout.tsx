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
