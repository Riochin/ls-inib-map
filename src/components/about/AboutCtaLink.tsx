import { ABOUT_CTA_LABEL } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'

/**
 * 「地図を開く」ボタン（`/about` のヒーローとまとめで共用・同期・presentational）。
 *
 * 地図トップ `/` への素の `<a>`。静的 SEO ページのためクライアント JS 非依存（area ページと同方針）。
 * スマホでは横幅いっぱい・高さ 3rem で押しやすくし、PC 幅では内容幅にする。
 */
export function AboutCtaLink() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- 静的SEOページのため素の<a>を使う
    <a
      href="/"
      className="inline-flex h-12 w-full items-center justify-center rounded-full px-8 text-base font-bold text-white transition-opacity hover:opacity-90 md:w-auto"
      style={{ backgroundColor: BRAND_PURPLE }}
    >
      {ABOUT_CTA_LABEL}
    </a>
  )
}
