import { Fragment } from 'react'
import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { ABOUT_FEATURES_HEADING, aboutFeatures } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'
import { PhoneFrame } from '@/components/about/PhoneFrame'

interface AboutFeaturesProps {
  /** 掲載中の営業店舗の総数（ポイント①の見出しに使う。データ由来）。 */
  totalStores: number
}

/**
 * 嬉しいポイント 3 つ（同期・presentational）。
 *
 * 各ポイントは「番号バッジ＋見出し（h3）＋説明＋実機スクショ（{@link PhoneFrame}）」。スマホは縦積み、
 * PC 幅（md 以上）は画像と文章を左右交互に置く。スクショは初回表示に不要なので遅延読み込み。
 * 番号バッジは装飾扱い（aria-hidden）にし、見出し内の `sr-only` テキストで読み上げに番号を伝える。
 */
export function AboutFeatures({ totalStores }: AboutFeaturesProps) {
  const features = aboutFeatures(totalStores)
  return (
    <section aria-labelledby="about-features-title" className="flex flex-col gap-14 md:gap-20">
      <h2
        id="about-features-title"
        className="text-center text-2xl"
        style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}
      >
        {ABOUT_FEATURES_HEADING}
      </h2>
      {features.map((f, i) => (
        <article key={f.title} className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <div className={i % 2 === 1 ? 'md:order-2 md:pl-4' : 'md:pr-4'}>
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: BRAND_PURPLE }}
            >
              {i + 1}
            </span>
            <h3 className="mt-4 text-xl leading-snug" style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}>
              <span className="sr-only">ポイント{i + 1}：</span>
              {/* 見出しの改行位置は PC 幅（md 以上）だけ固定。スマホでは 1 行に収まれば改行せず、
                  収まらないときも各部分（inline-block）の途中では折り返さず、部分の境目で折り返す */}
              {f.title.split('\n').map((line, j) => (
                <Fragment key={line}>
                  {j > 0 ? <br className="hidden md:inline" /> : null}
                  <span className="inline-block">{line}</span>
                </Fragment>
              ))}
            </h3>
            <p className="mt-4 text-base text-gray-700 leading-relaxed">{f.description}</p>
          </div>
          <PhoneFrame image={f.image} className="max-w-[250px] md:max-w-[270px]" />
        </article>
      ))}
    </section>
  )
}
