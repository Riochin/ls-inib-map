# 実装ギャップ分析: site-improvements

> 本書は要件 (`requirements.md`) と既存コードベースの差分を分析し、設計フェーズの判断材料を提供する。
> **方針:** 決定ではなく情報提供。複数の選択肢とトレードオフを提示する。

---

## 1. 既存コードベースの現状

### アーキテクチャ概要
- **サーバーレス静的Webアプリ** (Next.js 16 App Router / TypeScript strict / Vercel)。ランタイムAPI・DBなし。
- 地図描画は **`@vis.gl/react-google-maps` v1.7** (`Map` / `AdvancedMarker` / `InfoWindow` / `useMap`)。
- 店舗データは **手書きの静的TS** (`src/data/stores.ts`、239件、`closed: true` は1件)。
- 状態管理はローカル `useState` のみ。テストは Vitest (`src/__tests__/`、9ファイル)。
- `scripts/` ディレクトリは**空**、`.github/` は**存在しない**。

### 主要資産マップ
| 資産 | 場所 | 役割 |
|------|------|------|
| 地図コンテナ | `src/components/MapView.tsx` | Map本体・InfoWindow・SVGグラデ定義・ビューポート連携 |
| マーカー | `src/components/StoreMarker.tsx` | `AdvancedMarker` + SVG/絵文字 children (`memo`化) |
| ビューポートカリング | `src/hooks/use-visible-stores.ts` | `idle`イベントで範囲内店舗のみ抽出（純関数 `filterStoresByBounds` 付き） |
| テーマ/色分け | `src/lib/marker-color.ts` | `both`(紫)/`gundamOnly`(青)/`closed`(グレー) の3テーマ・グラデ定義 |
| フィルタ | `src/lib/filter.ts` | タイトル・住所・キーワードの合成フィルタ（純関数） |
| 住所パーサ | `src/lib/address-parser.ts` | 都道府県/市/区への正規表現パース・階層インデックス構築 |
| データ型 | `src/types/store.ts` | `Store` (id/name/address/lat/lng/games/closed) |
| ルート | `src/app/page.tsx` | 状態統合・全フィルタ合成・各UIの配線 |
| レイアウト | `src/app/layout.tsx` | metadata・GA4 (`@next/third-parties`) |

### 規約・パターン
- ロジックは**純関数として `src/lib/` に分離**しテスト可能化（カリング・フィルタ・パースすべてこの形）。
- コンポーネントは PascalCase、その他 kebab-case。`@/` = `src/`。
- 描画最適化が既に意識されている: `StoreMarker` は `memo`、SVGグラデは共有 `<defs>` で1回定義、カリングは `idle` + `useMemo`。

---

## 2. 要件別フィージビリティと差分

差分タグ: **[欠]** 欠落能力 / **[制]** 既存制約 / **[要]** 要調査 (Research Needed)

### Req 1: ピン描画パフォーマンス
- **[欠]** マーカークラスタリング: `@googlemaps/markerclusterer` 未導入。現状は1店舗=1 `AdvancedMarker`。
- **[制]** クラスタは `google.maps.Marker`/`AdvancedMarkerElement` を直接管理するため、宣言的な `@vis.gl` の `AdvancedMarker` (Reactコンポーネント) と**管理モデルが衝突**する。`useMap()` で `map` 取得後、命令的にクラスタラを生成する必要あり。
- **[欠]** data URI 画像マーカー: 現状はランタイムSVG children。テーマ3種ぶんの画像を**事前生成 (ビルド時/モジュールロード時)** し `content` に渡す仕組みが必要。`closed` の🌸(絵文字)も画像化対象。
- **[制] (好材料)** カリング (Req1.6) と `memo` による再生成抑制 (Req1.7) は**既に実装済み**。クラスタリングと共存させる設計が論点。
- **[要]** クラスタとカリングの責務分担: クラスタラ自身が広域での描画を担うなら、カリングの padding/有効ズーム閾値の再調整が要る可能性。

### Req 2: データ自動更新フロー
- **[欠]** スクレイピング: 公式2サイト (ラスサバ/イニブ) のHTML構造解析・パーサが皆無。
- **[欠]** ジオコーディング+キャッシュ: 住所→座標の変換処理とキャッシュファイルが皆無。
- **[欠]** GitHub Actions ワークフロー (`.github/workflows/`) が存在しない。cron・commit&push の自動化未整備。
- **[欠]** データ生成スクリプト: 現状 `stores.ts` は手書き。Node実行可能な生成パイプライン (`scripts/`) が必要。
- **[制]** 生成物は **`Store[]` 型互換のTSファイル** (または JSON+ローダ) でなければ既存の `import { stores }` を壊す。出力フォーマットの選択が論点。
- **[要]** 公式サイトのスクレイピング可否 (robots/利用規約/HTML安定性) — **設計フェーズで要確認**。
- **[要]** ジオコーディングAPIの選定 (Google Geocoding=有料/Nominatim=無料&レート制限) とキャッシュ永続化方法。
- **[要]** `id` の安定採番: 再生成時に既存IDを維持する戦略 (住所ハッシュ等)。差分検出 (Req2.4/2.7) の精度に直結。

### Req 3: 全国化
- **[制]** 現データは**関東4県のみ** (東京/神奈川/埼玉/千葉)。READMEも「関東エリア」と明記。
- **[好材料]** `address-parser.ts` は全国の住所表記 (政令市+区/郡+町村/23区) を既に汎用パースしており、**全国データでも原則そのまま動作**する見込み。`AddressFilterModal` も都道府県階層なので拡張不要。
- **[依存]** 本要件は実質 Req2 のパイプライン成果物。パイプラインが全国を取得すればデータ差し替えで達成。
- **[要]** 全国規模 (数百〜数千件?) でのクラスタ/カリング性能の実測 (Req3.3) — Req1の設計と一体で検討。

### Req 4: 店舗数表示
- **[欠]** 件数表示UIコンポーネントが無い。
- **[好材料]** `page.tsx` に総数 (`stores.length`) と絞り込み後 (`filteredStores.length`) が**既に計算済み**。表示コンポーネントを追加し props で渡すだけ。
- **[要]** 網羅率 (Req4.3, should): 公式総数の取得元。Req2スクレイプ時にメタ情報として記録できれば実現可能。

### Req 5: 最終更新日時
- **[欠]** `lastUpdated` フィールドが型・データ・UIのいずれにも無い。
- **影響範囲:** データ生成 (Req2側で埋め込み) + 表示UI + 日付フォーマット (`Intl.DateTimeFormat('ja-JP')`)。データ構造の置き場所 (メタ情報を `stores` とは別 export にするか) が論点。

### Req 6: チュートリアル/出典明示
- **[欠]** オンボーディング・ヘルプ・出典クレジットのUIが全て無い。localStorage利用箇所も現状なし。
- **[好材料]** 既存のモーダルパターン (`AddressFilterModal.tsx`) と常設ボタンパターン (`AddressFilterButton`/`SearchButton`/`LocateButton`) が**再利用可能なテンプレート**として存在。
- **[制]** SSR/hydration: `localStorage` 参照は `useEffect` 内に限定する必要 (初回判定のちらつき対策が論点)。

### Req 7: DB非採用の明文化
- **[欠]** 明文化された記録が無い。
- **対応:** `.kiro/steering/tech.md` または設計文書への追記のみ。コード変更なし。**最小工数**。

### Req 8: 開発プロセス (タスク粒度・コミット)
- **[好材料]** 既存git履歴が `feat:`/`fix:` + 日本語要約の規約を**既に遵守** (Phase分割コミットの実績あり)。
- **対応:** tasks.md 生成時の指針。コード差分なし。

---

## 3. 実装アプローチ選択肢

### Req 1 (クラスタリング+画像マーカー) — 最重要・最難
- **Option A — `@vis.gl` 宣言マーカー維持 + clusterer命令的併用:** `useMap()`+`useEffect` でclustererを生成し、`AdvancedMarkerElement` を命令的に供給。
  - ✅ 既存 `AdvancedMarker` の知見を一部流用 ❌ 宣言/命令の2モデル混在で複雑・state同期が難所
- **Option B — マーカー描画をclustererに全面委譲 (推奨候補):** `StoreMarker` Reactコンポーネントを廃し、`MarkerClusterer` + 事前生成画像 (`PinElement`/`img content`) で命令的に統一管理。
  - ✅ 単一管理モデルで性能・責務が明快、data URI画像化 (Req1.4) と自然に両立 ❌ 既存 `StoreMarker.tsx` を置換、InfoWindow連携の再配線が必要
- **Option C — ハイブリッド:** カリングは既存フックを残しつつ、その出力をclustererへ渡す。
  - ✅ カリング資産を活かし段階移行可能 ❌ カリングとクラスタの二重間引きで閾値調整が要る
- **論点:** data URI画像の生成方式 (Canvas事前描画 / SVG文字列→data URI / 静的pngアセット)。クラスタとビューポートカリングの責務境界。

### Req 2 (データパイプライン) — 工数最大
- **Option B (新規構築・実質一択):** `scripts/` にスクレイプ→ジオコーディング(キャッシュ)→`stores.ts`生成のNodeスクリプト群を新設 + `.github/workflows/` に cron ワークフロー新設。
  - ✅ ランタイムを汚さずビルド前パイプラインに隔離（要件8.x/2.8と整合） ❌ 新規依存(HTMLパーサ・ジオコーダ)・CI秘密情報管理・冪等性設計
- **論点:** 出力を `stores.ts` (型安全) にするか `stores.json`+ローダにするか。キャッシュの置き場 (リポジトリ内 `scripts/cache/` をcommit)。差分なし時のno-op (Req2.7)。失敗時の非破壊 (Req2.6)。

### Req 4/5/6 (情報提示UI) — 既存パターン拡張
- **Option A (推奨):** `page.tsx` に props を足し、新規小コンポーネント (`StoreCount` / `LastUpdated` / `Onboarding` + `HelpButton` / `Credit`) を追加。既存のボタン/モーダル/オーバーレイ規約を踏襲。
  - ✅ 低リスク・パターン一貫 ❌ `page.tsx` の配線がやや増える (許容範囲)

### Req 7/8 (明文化) — ドキュメント追記のみ

---

## 4. 工数・リスク評価

| 要件 | 工数 | リスク | 根拠 |
|------|------|--------|------|
| Req1 ピン性能 | **M** | **High** | clusterer×宣言マーカーの統合とdata URI化に既知の解がなく試行が要る |
| Req2 自動更新 | **L** | **High** | スクレイプ可否・ジオコーディング・CI冪等性と外部依存が集中 |
| Req3 全国化 | **S** | **Medium** | パーサ等は流用可だがデータ規模での性能は実測待ち (Req1/2依存) |
| Req4 店舗数 | **S** | **Low** | 件数は計算済み、表示追加のみ |
| Req5 更新日時 | **S** | **Low** | フィールド追加+整形表示。Req2と連動 |
| Req6 チュートリアル | **S** | **Low** | 既存モーダル/ボタン規約を流用 |
| Req7 DB非採用 | **S** | **Low** | 文書追記のみ |
| Req8 プロセス | **S** | **Low** | 既存git規約に準拠済み |

---

## 5. 設計フェーズへの提言

### 推奨アプローチの方向性
- **依存順:** Req2(パイプライン) を骨格に据え、その出力に Req3(全国データ)・Req5(lastUpdated)・Req4(公式総数メタ) を相乗りさせるのが効率的。Req1 は独立して先行可能 (優先度🔴と整合)。
- **Req1:** Option B (clusterer全面委譲 + 事前生成画像) を軸に、既存カリング資産との共存可否を設計で検証。
- **Req2:** `scripts/` + `.github/workflows/` の新規構築。出力フォーマット・キャッシュ永続化・冪等性を設計で確定。
- **UI系 (4/5/6):** 既存ボタン/モーダル規約の拡張で統一。

### 設計フェーズへ持ち越す調査項目 (Research Needed)
1. 公式2サイトのスクレイピング可否・HTML構造・利用規約 (Req2)
2. ジオコーディングAPI選定とキャッシュ永続化方式 (Req2)
3. 再生成時の `id` 安定採番と差分検出ロジック (Req2.4/2.7)
4. `@googlemaps/markerclusterer` と `@vis.gl/react-google-maps` の統合パターン (Req1)
5. data URI / Canvas / 静的アセットいずれでマーカー画像を生成するか (Req1.4)
6. 全国規模データでのクラスタ+カリング性能の実測 (Req1.3/Req3.3)
7. 出力データフォーマット (`stores.ts` vs JSON+ローダ) とメタ情報 (lastUpdated/公式総数) の格納設計 (Req2/4/5)
