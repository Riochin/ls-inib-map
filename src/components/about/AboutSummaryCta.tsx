import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { aboutSummary } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'
import { AboutCtaLink } from '@/components/about/AboutCtaLink'

interface AboutSummaryCtaProps {
  /** 掲載中の営業店舗の総数（まとめ文に使う。データ由来）。 */
  totalStores: number
}

/**
 * まとめの帯＋2 回目の「地図を開く」ボタン（同期・presentational）。
 * 薄い紫の帯で視線を一度止め、LP 部分の締めにする。この下に既存の説明・FAQ が続く。
 */
export function AboutSummaryCta({ totalStores }: AboutSummaryCtaProps) {
  return (
    <section aria-labelledby="about-summary-title" className="rounded-3xl bg-purple-50 px-6 py-10 text-center md:px-10 md:py-14">
      <h2
        id="about-summary-title"
        className="text-xl leading-relaxed"
        style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}
      >
        {aboutSummary(totalStores)}
      </h2>
      <div className="mt-7 flex justify-center">
        <AboutCtaLink />
      </div>
    </section>
  )
}
