/**
 * 検索エンジン／スクリーンリーダー向けの最小限の本文テキスト。
 *
 * トップページ（`page.tsx`）はほぼ全面が地図の Client Component で、初期 HTML に
 * クロール可能なテキストが title/description しか含まれない。本コンポーネントは
 * 文書構造のための単一の `<h1>` を Server Component として供給する。
 *
 * かつて出力していた都道府県別の全店リスト（`sr-only`）は、可視の
 * エリアページ（`/area`・`/area/[pref]`）へ移管したため撤去した。これにより
 * 「visible は薄く hidden は濃い」隠しテキストのスパム判定リスクを構造的に解消する。
 * 地図 UI の見た目には影響させないため、`sr-only` での非表示は維持する。
 */
export function SeoContent() {
  return (
    <section className="sr-only" aria-label="サイト概要">
      <h1>ラスサバ・イニブ 設置店舗マップ｜全国のゲームセンターを地図で検索</h1>
      <p>
        ジョジョの奇妙な冒険 ラストサバイバー（ラスサバ）と機動戦士ガンダム EXTREME
        VS.2 INFINITEBOOST（イニブ）の設置店舗を地図で検索できる非公式アプリです。
        タイトル別フィルタ・店舗名検索・都道府県／市区町村での絞り込み・現在地からの検索に対応。
        都道府県別の設置店舗は<a href="/area">エリア一覧</a>から確認できます。
      </p>
    </section>
  )
}
