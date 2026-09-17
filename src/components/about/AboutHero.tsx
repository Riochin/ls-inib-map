import { CATCH_FONT_STYLE } from '@/lib/heading-font'
import { ABOUT_CATCHPHRASE_LINES, ABOUT_SUBCOPY, ABOUT_IMAGES } from '@/lib/about-copy'
import { AboutCtaLink } from '@/components/about/AboutCtaLink'
import { PhoneFrame } from '@/components/about/PhoneFrame'

/**
 * `/about` のヒーロー（同期・presentational）。
 *
 * ページ唯一の `<h1>`（キャッチコピー。黒文字で「10秒」だけ紫。トップのヘルプモーダルと同じ配色）・
 * サブ文・「地図を開く」ボタン・表紙の日本地図スマホ画像。
 * スマホは縦積み（コピー → サブ文 → ボタン → 画像）、PC 幅（md 以上）は左に文章・右に画像。
 * 画像は {@link PhoneFrame} でスマホ端末風に見せ、後ろにだけ薄い紫のぼかしを敷いて浮かせる。
 * ヒーロー画像は初回表示に必要なので `priority`（遅延読み込みしない）。
 */
export function AboutHero() {
  const hero = ABOUT_IMAGES.hero
  return (
    <section
      aria-labelledby="about-hero-title"
      className="grid gap-12 py-4 md:grid-cols-2 md:items-center md:gap-14 md:py-8"
    >
      <div className="md:pr-4">
        <h1
          id="about-hero-title"
          className="text-[2.25rem] leading-tight tracking-tight text-gray-900 md:text-[2.5rem]"
          style={CATCH_FONT_STYLE}
        >
          {ABOUT_CATCHPHRASE_LINES.map((line, i) => (
            <span key={i} className="block whitespace-nowrap">
              {line.map((seg) =>
                seg.emphasis ? (
                  <span key={seg.text} className="text-purple-700">
                    {seg.text}
                  </span>
                ) : (
                  seg.text
                ),
              )}
              {i < ABOUT_CATCHPHRASE_LINES.length - 1 ? ' ' : null}
            </span>
          ))}
        </h1>
        <p className="mt-5 text-base text-gray-700 leading-relaxed md:mt-6">{ABOUT_SUBCOPY}</p>
        <div className="mt-8 md:mt-10">
          <AboutCtaLink />
        </div>
      </div>
      <div className="relative py-6">
        <div aria-hidden="true" className="absolute inset-x-4 inset-y-14 rounded-full bg-purple-100 blur-3xl" />
        <PhoneFrame image={hero} priority className="relative max-w-[280px] md:max-w-[300px]" />
      </div>
    </section>
  )
}
