import type { Metadata } from 'next'
import { CATCH_FONT_STYLE } from '@/lib/heading-font'
import { SiteFooter } from '@/components/SiteFooter'

/**
 * 存在しないURLへのアクセス時に表示するページ（404・Server Component）。
 *
 * ルート直下（`src/app/`）に置くことで Next.js が自動的に404ステータスで描画する。
 * globals.css が body を `overflow: hidden`（地図全画面）にしているため、
 * `/about` 等と同様に独自のスクロールコンテナで表示する。見出しに使う文言が
 * layout.tsx の `&text=` サブセットに含まれないため、ここでは全文字版フォントを読み込む。
 */

export const metadata: Metadata = {
  title: 'ページが見つかりません',
}

export default function NotFound() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700&display=swap"
        rel="stylesheet"
      />
      <div className="h-screen overflow-y-auto bg-white text-gray-900">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
          <header>
            <h1 className="text-2xl leading-snug" style={{ ...CATCH_FONT_STYLE, color: '#7B2FBE' }}>
              ページが見つかりません
            </h1>
            <p className="mt-2 text-gray-700 leading-relaxed">
              お探しのページは移動または削除された可能性があります。URLをご確認いただくか、下記のリンクからお探しください。
            </p>
          </header>

          <SiteFooter />
        </div>
      </div>
    </>
  )
}
