import { HEADING_FONT_STYLE } from '@/lib/heading-font'
import { ABOUT_PAIN_HEADING, ABOUT_PAIN_POINTS } from '@/lib/about-copy'
import { BRAND_PURPLE } from '@/lib/brand'

/**
 * 困りごとの吹き出し（同期・presentational）。
 *
 * 紹介配信スライドの「調べないといけないことが多すぎる」の導入を再現する。角丸チップ（薄い紫地に
 * 濃い紫文字で統一）を横に流して折り返し、雑談の空気を出す。締めの一文は置かず、吹き出しだけで見せる。
 * 見出し「こんなときに使えます」を吹き出しの上に置く（「嬉しいポイント」と同じ見出しスタイル）。
 */
export function AboutPainPoints() {
  return (
    <section aria-labelledby="about-pain-title">
      <h2
        id="about-pain-title"
        className="mb-8 text-center text-2xl md:mb-10"
        style={{ ...HEADING_FONT_STYLE, color: BRAND_PURPLE }}
      >
        {ABOUT_PAIN_HEADING}
      </h2>
      <ul className="flex flex-wrap justify-center gap-x-2.5 gap-y-4 md:gap-x-4 md:gap-y-5">
        {ABOUT_PAIN_POINTS.map((text) => (
          <li key={text} className="rounded-full bg-purple-50 px-4 py-2 text-sm text-purple-900 md:px-6 md:py-3 md:text-lg">
            {text}
          </li>
        ))}
      </ul>
    </section>
  )
}
