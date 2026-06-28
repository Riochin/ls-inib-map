/**
 * サイト内リンクの共有フッター（同期・presentational）。
 *
 * エリアページ（ハブ・県）と `/about` で共用し、地図トップ・設置店舗一覧・このサイトについて
 * の相互リンクを作る（クロール経路と回遊・内部リンク強化）。静的 SEO ページで使うため、
 * クライアント JS 非依存の素の `<a>` を用いる（area ページと同方針）。
 */

const BRAND_PURPLE = '#7B2FBE'

export function SiteFooter() {
  return (
    <footer className="mt-2 border-t border-purple-100 pt-4">
      {/* 静的SEOページのため、クライアントJS非依存の素の<a>を使う（area ページと同方針） */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <nav aria-label="サイト内リンク" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href="/" className="hover:underline" style={{ color: BRAND_PURPLE }}>
          地図トップ
        </a>
        <a href="/area" className="hover:underline" style={{ color: BRAND_PURPLE }}>
          設置店舗一覧
        </a>
        <a href="/about" className="hover:underline" style={{ color: BRAND_PURPLE }}>
          このサイトについて
        </a>
      </nav>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
    </footer>
  )
}
