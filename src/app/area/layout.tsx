import type { ReactNode } from 'react'

/**
 * `/area` 配下（ハブ・県ページ）共通レイアウト。
 *
 * トップ（地図アプリ）はブランド見出しフォント（M PLUS Rounded 1c）を `&text=` で
 * 使用文字のみサブセット読込しているため、動的な県名・店名には使えない。エリアページは
 * 読み物コンテンツなので、ここで **全文字版** のフォントを読み込み、見出しに丸ゴシックを
 * 当てられるようにする（design language の踏襲・Req 6.1）。
 *
 * また globals.css が body を `overflow: hidden`（地図全画面）にしているため、
 * エリアページは独自のスクロールコンテナでスクロール可能にする。
 */
export default function AreaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700&display=swap"
        rel="stylesheet"
      />
      <div className="h-screen overflow-y-auto bg-white text-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
      </div>
    </>
  )
}
