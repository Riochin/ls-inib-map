# Research & Design Decisions: site-improvements

---
**Purpose**: 設計判断の根拠となる調査結果・アーキテクチャ検討・トレードオフを記録する。
**Usage**: discovery フェーズの調査ログ。`design.md` に書ききれない詳細な比較・根拠を保持する。
---

## Summary
- **Feature**: `site-improvements`
- **Discovery Scope**: Complex Integration（既存の静的Webアプリへのクラスタリング描画 + ビルド前データ生成パイプラインの新設）
- **Key Findings**:
  - 公式2サイト（ラスサバ / イニブ）は**同一の Bandai Namco AM プラットフォーム**上にあり、`./list?area=JP-XX`（東京は `&sw=1`=23区 / `&sw=0`=多摩）という共通URL構造で店舗一覧を**サーバーサイドレンダリングの静的HTML**として返す。ヘッドレスブラウザ不要でスクレイプ可能。
  - 一覧HTMLには店舗名・住所・設置台数・詳細リンク（`detail?loc_id=...` の安定ID）が含まれるが、**緯度経度は含まれない**ためジオコーディングが必須。
  - `@vis.gl/react-google-maps` は `@googlemaps/markerclusterer` との統合公式例を提供しており、`useMap()` で取得した `map` に対し命令的に `MarkerClusterer` を生成するパターンが確立している。
  - 既存コードはカリング（`use-visible-stores`）・`memo`・共有SVGグラデを既に備え描画最適化済み。クラスタラのビューポートアルゴリズムがカリングを内包するため、手動カリングは置換可能。

## Research Log

### 公式サイトのスクレイピング可否とHTML構造（Req2.1, 2.2, 3.2）
- **Context**: 自動更新パイプラインの入口。スクレイプ可能か、JS実行が必要か、データ構造はどうか。
- **Sources Consulted**:
  - https://bandainamco-am.co.jp/am/vg/jojols/location/ （ラスサバ ロケーション トップ）
  - https://bandainamco-am.co.jp/am/vg/jojols/location/list?area=JP-13 （東京一覧）
  - https://gundam-vs.jp/extreme/ac2ib/location/ （イニブ ロケーション トップ）
- **Findings**:
  - トップページは地理情報による「近くの店舗」を JS で取得するが、**地域別一覧 `./list?area=JP-XX` はサーバーサイドで店舗データを埋め込んだ静的HTML**を返す（要 area コード JP-01〜JP-47 で全国走査）。
  - 東京（JP-13）のみ `&sw=1`（23区）・`&sw=0`（23区外）で分割。
  - 一覧の各店舗は `店舗名（detail?loc_id=<ID> へのリンク）` + `住所テキスト` + `N台設置` を持つ。`loc_id` はサイト内で安定。
  - 緯度経度は一覧・詳細いずれにも明示されない（地図は別途座標を持つ可能性があるが、安定取得のため住所ジオコーディングを採用）。
- **Implications**:
  - スクレイパは「area コード列挙 → 各一覧HTMLをfetch → DOMパースで店舗抽出」というシンプルな構成で全国対応可能（Req3 を Req2 のパイプラインに内包）。
  - HTMLパーサ（`node-html-parser` 等の軽量ライブラリ）を devDependency に追加。ヘッドレスブラウザは不要。
  - HTML構造変化に対する脆弱性が残るため、パース結果の件数バリデーション（0件や急減を異常とみなす）で非破壊性（Req2.6）を担保する。

### 店舗の同一性判定と安定ID採番（Req2.3, 2.4, 2.7）
- **Context**: 再生成のたびにIDが変わると差分検出が壊れる。また同一物理店舗が両サイトに掲載される（両タイトル稼働）ため統合が必要。
- **Findings**:
  - `loc_id` はサイトごとに独立し、ラスサバとイニブで同一店舗でも異なるため**クロスサイトの統合キーには使えない**。
  - 物理店舗の同一性は **正規化済み住所（全角/半角・空白統一）** が最も安定した自然キー。
- **Implications**:
  - 統合キー = 正規化住所。両サイトの掲載をこのキーでマージし、`games[]` を合成（片方=単独タイトル、両方=両タイトル）。
  - `id` = 正規化住所のハッシュ（短縮）に基づく決定論的採番。再生成しても住所が同じなら同一ID → 差分検出（Req2.4/2.7）が安定。
  - 既存の手書き `stores.ts` のID（`tokyo-001` 等）とは非互換になるが、IDは外部公開されずアプリ内部のReactキー用途のみのため移行可能。

### ジオコーディングとキャッシュ（Req2.2, 2.3） — 決定: Google Geocoding API
- **Context**: 住所→座標変換の手段選定。コスト・精度・利用規約のトレードオフ。
- **Sources Consulted**: https://operations.osmfoundation.org/policies/nominatim/
- **Findings**:
  - **Nominatim（無料）**: 1 req/秒、User-Agent必須、結果キャッシュ必須、帰属表示必須。定期実行スクリプトは 4 req/分に制限。日本語住所の精度はGoogleに劣る。
  - **Google Geocoding API（有料）**: 日本語住所の精度が高い。既にGoogle Maps APIキーを保有。キャッシュ前提で初回以降の請求はごく僅か。
- **Decision**: **Google Geocoding API** を採用（ユーザー合意）。
- **Implications**:
  - CIに `GOOGLE_GEOCODING_API_KEY` を GitHub Secret として登録（Maps表示用キーとは別キー推奨／キー制限を分離）。
  - ジオコーディング結果は `scripts/cache/geocode.json`（正規化住所→{lat,lng}）にリポジトリ内永続化し commit。次回以降は同一住所を再問い合わせしない（Req2.3）。

### マーカークラスタリングと描画軽量化（Req1.1〜1.7, 3.3） — 決定: クラスタ全面委譲 + SVG data URI
- **Context**: 現状 1店舗=1 `AdvancedMarker`（Reactコンポーネント）。全国規模で数百〜数千件になると描画コストが増大。
- **Sources Consulted**:
  - https://visgl.github.io/react-google-maps/examples/marker-clustering
  - https://visgl.github.io/react-google-maps/examples/custom-marker-clustering
  - https://github.com/visgl/react-google-maps/discussions/325, /406, /640
- **Findings**:
  - 公式統合パターン: `useMap()` で `map` を取得し `useEffect`/`useMemo` 内で `MarkerClusterer` を命令的に生成、`AdvancedMarkerElement` をマーカーとして供給。`renderer` でクラスタバブルをカスタム描画可能。
  - `markerclusterer` のビューポート系アルゴリズム（SuperClusterViewportAlgorithm）は**表示範囲外を自動的に描画対象から除外**するため、手動カリングと機能が重複する。
  - クリック/InfoWindowは、marker→store の対応表を保持し marker の `gmp-click` で React 側 state（`openStoreId`）を更新する形で既存の単一InfoWindowを流用できる。
- **Decision**: **Option B（クラスタ全面委譲）** を採用（ユーザー合意）。`StoreMarker` Reactコンポーネントを廃し、命令的な `MarkerClusterer` + 事前生成SVG data URI 画像に統一。手動カリングフック（`use-visible-stores`）は廃止（Req1.6のビューポート除外はクラスタラが内包）。マーカー画像は **SVG文字列→data URI** をモジュール読込時にテーマ3種ぶん生成（Req1.4、ユーザー合意）。
- **Implications**:
  - 既存の `StoreMarker.tsx`・`use-visible-stores.ts` は撤去対象。`MapView` 内のマーカー描画を命令的クラスタ管理フック（新規 `use-store-clusterer`）へ置換。
  - 既存のグラデ・色分けデザイン（紫/青/グレー・🌸）はSVG文字列に移植して視覚的識別を維持（Req1.5）。
  - 同一店舗集合・同一表示範囲ではマーカー再生成を行わない（Req1.7）よう、store配列の参照安定とマーカーキャッシュで制御。

### 出力データフォーマットとメタ情報（Req2, 4, 5） — 決定: stores.json + ローダ
- **Context**: 生成物の形式。型安全性・差分の読みやすさ・メタ情報の格納先。
- **Decision**: **`stores.json` + 薄いローダ** を採用（ユーザー合意）。
- **Implications**:
  - `src/data/stores.json` に `{ lastUpdated, source, officialTotals, stores: Store[] }` を格納。
  - `src/data/stores.ts` は JSON を読み込み型付けして re-export する薄いローダに変更（既存の `import { stores }` 利用箇所を最小改修で維持）。
  - `lastUpdated`（Req5）と公式総数 `officialTotals`（Req4.3 網羅率）を同一JSONのメタ領域に同梱。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 描画A: 宣言マーカー維持+clusterer併用 | `AdvancedMarker` を残しつつ命令的clusterer供給 | 既存知見を一部流用 | 宣言/命令の2モデル混在で状態同期が複雑 | 不採用 |
| 描画B: clusterer全面委譲（採用） | Reactマーカー廃止、命令的にクラスタ統一管理 + data URI画像 | 単一管理モデルで性能・責務明快、画像化と自然両立、カリング内包 | `StoreMarker`/InfoWindow連携の再配線 | **採用** |
| 描画C: ハイブリッド | 既存カリング出力をclustererへ渡す | 資産流用・段階移行 | 二重間引きで閾値調整が必要 | 不採用 |
| パイプライン: ビルド前隔離（採用） | `scripts/` + `.github/workflows/` でビルド前にデータ生成 | ランタイムを汚さず Req2.8/8 と整合 | 新規外部依存・CI秘密管理・冪等性設計 | **採用（実質一択）** |

## Design Decisions

### Decision: ランタイムDBを導入せず静的データ + ビルド前パイプラインを維持（Req7）
- **Context**: データ鮮度を上げつつサーバーレス静的アプリ方針を守る。
- **Alternatives Considered**:
  1. ランタイムDB（Turso等）+ API — 動的更新可能だが運用・コスト増、現要件に過剰。
  2. ビルド前オフラインパイプライン + 静的JSON配信 — サーバーレス維持。
- **Selected Approach**: GitHub Actions cron でスクレイプ→ジオコーディング→`stores.json`再生成→差分時のみcommit&push→Vercel自動デプロイ。
- **Rationale**: 読み取り専用・小規模・低頻度更新のデータ特性に最適。ステアリング（tech.md）方針と一致。
- **Trade-offs**: リアルタイム性はないが、運用コストゼロ・CDNエッジ配信の高速性を確保。
- **Follow-up**: 将来ユーザー投稿等の動的要件が出た時点でDB採用を再検討する旨を steering に明記（Req7.3）。

### Decision: 失敗時の非破壊とno-op（Req2.6, 2.7）
- **Context**: スクレイプ失敗・HTML構造変化で既存データを壊さない。差分なし時にコミットしない。
- **Selected Approach**: パース結果を件数・必須フィールドでバリデーション（総件数が既存比で極端に減少→異常終了し既存JSON維持）。生成JSONと現行JSONを正規化比較し、差分なしならファイルを書き換えず（`lastUpdated` 単独差分でコミットを誘発しないよう、比較対象から `lastUpdated` を除外）。
- **Trade-offs**: 正当な大幅減（実際の閉店ラッシュ）も異常扱いになり得るため、閾値はログ可視化し手動上書き手段を残す。

### Decision: 公式非掲載店舗（移設）の扱い ※閉店とは別
- **Context**: 公式一覧から消えた店舗を残すか削除するか。**閉店（恒久・手動判定）と移設（公式一覧から消失＝筐体の移設/撤去の可能性）は別物**として区別する（ユーザー合意）。
- **Selected Approach**:
  - **閉店（`closed`）**: 現行どおり手動管理。マーカーはグレー＋🌸。本パイプラインでは変更しない（既存の桜表示を維持）。
  - **移設（`delisted`）**: 直近スクレイプに存在しないが過去データに存在した店舗は削除せず `delisted: true` を付与して保持。マーカーは**グレーピン（絵文字なし）**、表示ラベル/InfoWindow は**「移設？」**（？で不確定を含意）。`closed` と重なる場合は `closed`（🌸）を優先表示。次回以降も非掲載が続けば保持し続ける（手動整理可能）。
- **重要な前提（誤判定防止）**: 移設判定は当該店舗の area が今回正常取得できた場合（`scrapedAreas` に含まれる）のみ適用する。area単位の取得失敗時はその area の店舗状態を変更しない（Req2.6 の非破壊を area 粒度でも担保）。
- **Trade-offs**: データが単調増加しうるが、「移設したかも」という情報もユーザー価値があるため保持を優先。閉店と区別することで誤情報を避ける。

## Risks & Mitigations
- **公式HTML構造の変更** — パーサのバリデーションと件数異常検知で非破壊フォールバック（Req2.6）。CIログで検知。
- **クラスタ×命令的管理の状態同期バグ** — marker→store 対応表とマーカーキャッシュをフックに集約し単体テスト可能化。
- **全国規模での描画性能** — ビューポートアルゴリズム採用で実測検証（Req1.3/3.3）。必要なら gridSize/maxZoom を調整。
- **Geocoding APIキー漏洩** — Maps表示キーと分離し、CI専用キーにIP/API制限を設定。`stores.json` には座標のみ格納しキーは残さない。
- **SSR/hydration（localStorage）** — オンボーディング初回判定は `useEffect` 内に限定しちらつきを抑制（Req6.2）。

## References
- [react-google-maps Marker Clustering example](https://visgl.github.io/react-google-maps/examples/marker-clustering) — 公式統合パターン
- [react-google-maps Custom Marker Clustering](https://visgl.github.io/react-google-maps/examples/custom-marker-clustering) — supercluster + AdvancedMarker
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) — ジオコーディング無料案の制約（不採用根拠）
- [ラスサバ ロケーション](https://bandainamco-am.co.jp/am/vg/jojols/location/) / [イニブ ロケーション](https://gundam-vs.jp/extreme/ac2ib/location/) — スクレイプ対象
