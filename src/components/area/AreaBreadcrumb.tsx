/**
 * 県ページのパンくず（可視）。ホーム → 設置店舗 → ○○県。
 *
 * 構造化データ（BreadcrumbList JSON-LD）は `lib/area-seo.ts` 側で別途出力するため、
 * ここは利用者向けの可視ナビゲーションに専念する（presentational・状態なし）。
 *
 * 内部リンクは `next/link` ではなく素の `<a>` を用いる。エリアページはクライアント JS に
 * 依存しない静的コンテンツ（Req 7.1）であり、クローラブルな素のアンカーが要件に合う。
 */
export function AreaBreadcrumb({ prefecture }: { prefecture: string }) {
  return (
    <nav aria-label="パンくず" className="text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 静的SEOページのためクライアントJS非依存の素の<a>を使う（Req 7.1） */}
          <a href="/" className="hover:underline" style={{ color: '#7B2FBE' }}>
            ホーム
          </a>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 同上 */}
          <a href="/area" className="hover:underline" style={{ color: '#7B2FBE' }}>
            設置店舗
          </a>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" className="text-gray-700">
          {prefecture}
        </li>
      </ol>
    </nav>
  )
}
