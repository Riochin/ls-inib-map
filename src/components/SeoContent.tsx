import { getAreaPrefectures } from '@/lib/area'

/**
 * トップページ（地図）専用の、検索エンジン／スクリーンリーダー向け本文とサイト内リンク。
 *
 * トップページ（`MapPage`）はほぼ全面が地図の Client Component で、初期 HTML に
 * クロール可能なテキストが title/description しか含まれない。本コンポーネントは
 * 文書構造のための単一の `<h1>` と、全都道府県のエリアページ・`/about` への
 * 内部リンクを Server Component として供給する。
 *
 * トップは外部リンクを最も集める入口なのに、以前は `/area` への1本しか内部リンクが無く、
 * 県ページはサイトマップ経由でしか見つからない「2ホップ・単一経路」だった。ここから全県へ
 * 直接リンクすることで、クロール優先度（検出→クロール）を上げる。
 *
 * かつて出力していた都道府県別の全店リスト（`sr-only`）は、可視の
 * エリアページ（`/area`・`/area/[pref]`）へ移管したため撤去した。ここに置くのは
 * 「可視ページと同じ行き先へのナビゲーションリンク」だけに限定し、隠しテキストで本文を
 * 水増ししない（店名・台数など本文相当の情報は出さない）。
 * 地図 UI の見た目には影響させないため、`sr-only` での非表示は維持する。
 *
 * `/area` 配下・`/about` は各ページが可視の `<h1>` を持つため、本コンポーネントは
 * root layout ではなくトップページだけで描画する（h1 の重複回避）。
 */
export function SeoContent() {
  const areas = getAreaPrefectures()
  return (
    <section className="sr-only" aria-label="サイト概要">
      <h1>ラスサバ・イニブ 設置店舗マップ｜全国のゲームセンターを地図で検索</h1>
      {/* 静的リンクのため、クライアントJS非依存の素の<a>を使う（area ページと同方針） */}
      {/* eslint-disable @next/next/no-html-link-for-pages */}
      <p>
        ジョジョの奇妙な冒険 ラストサバイバー（ラスサバ）と機動戦士ガンダム EXTREME
        VS.2 INFINITEBOOST（イニブ）の設置店舗を地図で検索できる非公式サイトです。
        タイトル別フィルタ・店舗名検索・都道府県／市区町村での絞り込み・現在地からの検索に対応。
        都道府県別の設置店舗は<a href="/area">エリア一覧</a>から、サイトの説明は
        <a href="/about">このサイトについて</a>から確認できます。
      </p>
      <nav aria-label="都道府県別の設置店舗ページ">
        <ul>
          {areas.map((area) => (
            <li key={area.slug}>
              <a href={`/area/${area.slug}`}>{area.prefecture}の設置店舗</a>
            </li>
          ))}
        </ul>
      </nav>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
    </section>
  )
}
