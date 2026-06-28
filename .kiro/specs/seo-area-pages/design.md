# 技術設計書: seo-area-pages

## Overview

本機能は、既存の地図アプリ（`/`）を変更せずに、店舗データ（住所つき約760店）から **都道府県エリアページ群を SSG で生成**し、地名つき・タイトル別の検索流入の受け皿を作る。同時にトップの `SeoContent`（`sr-only` の全店リスト）を撤去し、隠しテキスト（可視は薄く隠しは濃い）のスパム判定リスクを構造的に解消する。

データは既存の `stores` / `storesMeta` をそのまま使い、住所のパースは既存 `parseAddress` を再利用する。新規の手作業データは発生せず、ビルド時に自動生成される。

対象ユーザーは、ラスサバ・イニブをプレイするアーケードゲーマー（スマホ主体・ノンテック層）。検索（特に「イニブ 福岡」等の地名つき）からエリアページに着地し、必要に応じて既存アプリ（`/?store=<id>`）へ送客する。

### Goals

- 店舗が存在する都道府県ごとに、見える・クロール可能な静的ページ `/area/[pref]` を生成する
- 1ページ内をタイトル別（イニブ／ラスサバ）の `<h2>` セクションに分け、地名×タイトルのクエリ照準を合わせる（クエリ実績準拠）
- エリア一覧ハブ `/area` を新設し、巡回入口とページ間回遊を作る
- トップの隠し全店リストを撤去し、単一 `<h1>` のみ残す
- 既存の地図・フィルタ・検索・クラスタ機能、およびアプリの見た目への影響ゼロ

### Non-Goals

- 個別店舗ページ（約760枚）の生成 — scaled content / doorway pages のリスクが高いため都道府県粒度に限定する
- 市区・エリア（繁華街）粒度のページ — 効果を見てから将来検討（本スコープ外）
- アプリ（`/`）内への導線追加 — 実装段階で見て決める（当面は sitemap とページ間リンクのみで巡回。UI 変更なし）
- 個別店舗の LocalBusiness マークアップ — 第三者施設・個別ページ無しのガイドラインリスクのため不採用（既存方針を踏襲）
- 日本語スラッグ URL（`/area/東京都`） — エンコードで可読性が落ちるためローマ字スラッグを採用

---

## Architecture

### Existing Architecture Analysis

- `src/app/page.tsx`: `'use client'` の地図アプリ本体。本機能では**変更しない**。店舗フォーカスは既存の `?store=<id>` クエリで動作（`useIsomorphicLayoutEffect` で読み取り済み）。
- `src/components/SeoContent.tsx`: Server Component。`sr-only` で `<h1>` ＋全760店の都道府県別リストを出力。本機能で**全店リストを撤去**し、単一 `<h1>` のみに縮小する。
- `src/app/layout.tsx`: `metadata` / WebApplication JSON-LD / `<SeoContent />` の描画。`SeoContent` の縮小に伴う調整のみ。
- `src/lib/address-parser.ts`: `PREFECTURES`（47都道府県の正式名配列）と `parseAddress(rawAddress): ParsedAddress` を提供。都道府県の集計に再利用する。
- `src/data/stores.ts`: `stores: Store[]` と `storesMeta`（`lastUpdated`, `source`）。エリアページの唯一のデータソース。
- `src/types/store.ts`: `Store`（`name`/`address`/`games`/`machineCounts`/`closed`/`delisted` 等）。
- `src/app/sitemap.ts` / `src/app/robots.ts`: 現状 `/` のみ。エリアページ群を追加する。

### 新規・変更コンポーネント一覧

| 対象 | 種別 | 役割 |
|------|------|------|
| `src/lib/area.ts` | 新規 | エリア集計ロジック（都道府県→店舗、タイトル別グルーピング、件数）。SSR/ビルド時に純関数で動作 |
| `src/lib/prefecture-slug.ts` | 新規 | 都道府県正式名 ⇔ ローマ字スラッグの双方向マップ（例 `東京都` ⇔ `tokyo`）。47件の定数 |
| `src/app/area/page.tsx` | 新規 | ハブページ `/area`（Server Component, SSG） |
| `src/app/area/[pref]/page.tsx` | 新規 | 県ページ `/area/[pref]`（Server Component, SSG, `generateStaticParams` + `generateMetadata`） |
| `src/components/area/AreaStoreList.tsx` | 新規 | タイトル別セクション内の店舗一覧（presentational） |
| `src/components/area/AreaBreadcrumb.tsx` | 新規 | パンくず（可視＋構造化データ用データ供給） |
| `src/components/SeoContent.tsx` | 変更 | 全店リスト撤去・単一 `<h1>` のみに縮小 |
| `src/app/sitemap.ts` | 変更 | `/area` と全 `/area/[pref]` を追加 |

### データフロー

```
stores (静的データ)
   └─ lib/area.ts: getAreaPrefectures() → [{ prefecture, slug, total, byGame }]
        ├─ /area/page.tsx        … 全県リンク集（SSG）
        └─ /area/[pref]/page.tsx … generateStaticParams で全スラッグを列挙（SSG）
              └─ getAreaForPrefecture(pref) → { prefecture, byGame: { 'gundam-exvs': Store[], 'jojo-ls': Store[] } }
                    └─ AreaStoreList（タイトル別 <h2> セクション）
                          └─ 各店「地図で見る」→ /?store=<id>
```

全ページはビルド時に SSG（リクエスト時 JS 不要）。データ更新（オーバーライド反映含む）は次回ビルドで自動反映される。

---

## Components and Interfaces

### `lib/prefecture-slug.ts`

47都道府県の正式名とローマ字スラッグの対応表（ヘボン式・小文字、`-` 不使用）。例: `北海道`→`hokkaido`, `東京都`→`tokyo`, `大阪府`→`osaka`, `神奈川県`→`kanagawa`。

```ts
export const PREFECTURE_SLUGS: Record<string, string> // 正式名 → スラッグ（47件）
export function slugToPrefecture(slug: string): string | null
export function prefectureToSlug(prefecture: string): string | null
```

スラッグは `PREFECTURES`（address-parser）と1対1で対応させ、件数の不一致はテストで検出する。

### `lib/area.ts`

```ts
export interface AreaSummary {
  prefecture: string            // 正式名（例「東京都」）
  slug: string                  // ローマ字スラッグ（例「tokyo」）
  total: number                 // 営業中の店舗数
  countByGame: Record<GameTitle, number>
}

export interface AreaDetail {
  prefecture: string
  slug: string
  total: number
  storesByGame: Record<GameTitle, Store[]>  // タイトル別（営業中のみ・店名昇順）
}

/** 店舗が1件以上ある都道府県のサマリ（都道府県名昇順）。ハブ/サイトマップ/静的パラメータ用。 */
export function getAreaPrefectures(): AreaSummary[]

/** 指定スラッグの県詳細。該当無し（店舗0 or 未知スラッグ）は null。 */
export function getAreaForPrefecture(slug: string): AreaDetail | null
```

集計ルール（既存 `SeoContent.groupByPrefecture` を踏襲）:
- `closed` または `delisted` の店舗は除外
- `parseAddress(store.address).prefecture` が空の店舗は除外
- 各店は `games` に含まれるタイトルのセクションに計上（複数タイトル店は両セクションに登場）
- 店名は `localeCompare(…, 'ja')` で昇順ソート

### `/area/[pref]/page.tsx`（県ページ）

- `export function generateStaticParams()` … `getAreaPrefectures()` の全 `slug` を返す（SSG）
- `export function generateMetadata({ params })` … `title`「○○県のラスサバ・イニブ 設置店舗一覧」、`description`（県名＋件数）、`alternates.canonical = /area/<slug>`
- 該当スラッグが無ければ `notFound()`
- 描画構造:
  - `<AreaBreadcrumb>`（ホーム → 設置店舗 → ○○県）
  - `<h1>`「○○県のラスサバ・イニブ 設置店舗一覧」
  - リード文（県内 N 店舗・データ出典・最終更新日）
  - タイトル別セクション（`countByGame` が1以上のタイトルのみ出力）:
    - `<h2>`「○○県のイニブ設置店（N店）」→ `<AreaStoreList game="gundam-exvs">`
    - `<h2>`「○○県のラスサバ設置店（N店）」→ `<AreaStoreList game="jojo-ls">`
  - 「地図アプリで○○県を見る」リンク
  - 近隣（または全）都道府県への内部リンク
  - JSON-LD（BreadcrumbList ＋ ItemList）

### `components/area/AreaStoreList.tsx`

各店舗行: 店名・住所・ゲーム別台数バッジ（`machineCounts[game]` があるもののみ）。行全体が `/?store=<store.id>` への `<a>`（クロール可能な内部リンク）。presentational・状態なし。

### `/area/page.tsx`（ハブ）

- `<h1>`「全国のラスサバ・イニブ 設置店舗マップ」＋総店舗数の概況文
- `getAreaPrefectures()` を都道府県名順（または地方区分順）に並べ、`<a href="/area/<slug>">○○県（N店）</a>` のリンク集
- `metadata` で canonical `/area`

### `SeoContent.tsx`（変更）

- `groupByPrefecture()` と全店リスト描画を**削除**
- 単一の `<h1>`（サイト名相当）と、必要なら数行のサイト説明（アクセシビリティの正当範囲）だけを残す
- レイアウト（`layout.tsx`）での描画位置は維持

### `sitemap.ts`（変更）

```ts
const areas = getAreaPrefectures()
return [
  { url: SITE_URL, priority: 1, changeFrequency: 'daily', lastModified },
  { url: `${SITE_URL}/area`, priority: 0.8, changeFrequency: 'weekly', lastModified },
  ...areas.map((a) => ({
    url: `${SITE_URL}/area/${a.slug}`,
    priority: 0.7,
    changeFrequency: 'weekly',
    lastModified,
  })),
]
```

---

## URL 設計

| URL | 内容 |
|-----|------|
| `/` | 地図アプリ（不変） |
| `/area` | 都道府県一覧ハブ |
| `/area/[pref]` | 県ページ（`[pref]` はローマ字スラッグ。例 `/area/tokyo`） |

- canonical は各ページ自身の絶対 URL（`metadataBase` 既設）
- 店舗フォーカスは既存仕様 `/?store=<id>` を再利用（新規パラメータ追加なし）

---

## SEO 設計上の判断

- **隠しテキスト撤去**: 「visible は薄く hidden は濃い」構成がスパム判定の主因。全店リストを可視のエリアページへ移管し、トップは単一 `<h1>` のみ残す（単一見出しは正当・無リスク）。
- **タイトル別 `<h2>`**: Search Console 実績が「イニブ 福岡」等のタイトル別地名クエリで来ているため、URL は県単位のまま `<h2>` で照準を合わせる（ページ数を増やさず薄さも回避）。
- **個別店舗ページ非生成**: 約760枚の薄い自動生成ページは scaled content / doorway 判定リスクが現実的。都道府県粒度に限定する。
- **内部リンク**: ハブ → 県 → 近隣県の相互リンクでクロール経路と回遊を確保。
- **ブランド評価維持**: トップの title/description/WebApplication JSON-LD は不変（「ラスサバ マップ」等の既存順位を後退させない）。

---

## 県ページ内 検索・絞り込み（追加スコープ: store-search）

### 方針

県ページの本文一覧に、クライアント側の検索・絞り込みを**段階的強化**として被せる。マップUI（`SearchBar` / `FilterBar`）の**コンポーネントは流用せず**、一致ロジックの純関数（`lib/filter.ts` / `lib/facility-filter.ts`）**のみ**を再利用する。これにより一致挙動が地図と自動的に一致し、二重実装のドリフトを防ぐ。`SearchBar.tsx`（`absolute top-16` の地図オーバーレイ）・`FilterBar.tsx`（`absolute` 浮遊・タイトル切替）はドキュメントフローの本文ページに不適合のため使わない。

タイトル切替（イニブ／ラスサバ）はページが既に `<h2>` セクションで分割済みのためファセットに含めない。「営業中のみ」も県ページが既に営業中店舗のみ（Req 1.6）のため除外する。提供ファセットは **最低台数・配信台あり・録画台あり・喫煙所あり** の4種。

### SSG・JS非依存の担保

検索UIは**閾値以上の県のみ**クライアントコンポーネント化する。クライアントコンポーネントの初期 state は「検索語なし・ファセットなし」で、初期描画は全店一覧（サーバー描画と一致）となるため、初期 HTML に全店が含まれ、JS無効でも全件が見える（Req 7.1 / Req 8.7 を満たす）。検索・ファセットUIは JS 実行後にのみ機能する純粋な付加機能。閾値未満の県は従来どおり完全な静的セクションのまま（クライアントJS不要）。

### 新規・変更コンポーネント

| 対象 | 種別 | 役割 |
|------|------|------|
| `src/components/area/AreaStoreSections.tsx` | 新規 | タイトル別 `<section>(h2 + AreaStoreList)` の描画を `AreaPageContent` から抽出した presentational。静的経路と検索経路の双方が再利用 |
| `src/components/area/AreaStoreFilter.tsx` | 新規 | `'use client'`。検索ボックス＋設備ファセット＋絞り込み結果を描画するアイランド。state は `query` と `FacilityFilter`（subset）。一致は純関数に委譲 |
| `src/lib/area.ts`（または `area-seo.ts`） | 変更 | 閾値定数 `AREA_SEARCH_MIN_STORES = 10` を追加（単一定数で調整可能） |
| `src/components/area/AreaPageContent.tsx` | 変更 | `detail.total >= AREA_SEARCH_MIN_STORES` のとき `<AreaStoreFilter>`、未満は `<AreaStoreSections>`（静的）に分岐 |

### 絞り込みロジック（セクション単位・純関数の再利用）

各タイトルセクションについて、当該タイトルでスコープして適用する:

```ts
// game は当該セクションのタイトル（'gundam-exvs' | 'jojo-ls'）
const visible = filterStoresByFacility(
  filterStoresByKeyword(storesByGame[game], query),
  facility,            // { minMachines, hasStreaming, hasRecording, hasSmoking, openOnly: false }
  game,                // 台数・配信台・録画台は当該タイトルでスコープ
)
```

- フリーテキスト: `filterStoresByKeyword`（店名＋住所・空白区切り AND）。店名だけでなく住所も対象なので「新宿」等のエリア語入力で実質的な所在地絞り込みも兼ねる。
- 設備: `filterStoresByFacility` を `openOnly: false` 固定で利用。`minMachines` はノンテック層向けにプリセットのチップ（例: 指定なし／4台以上／8台以上）で与える。`hasStreaming` / `hasRecording` / `hasSmoking` はトグルチップ。
- 可視0件のセクションは `<h2>` ごと隠す。全タイトルで0件のときは「該当する店舗がありません」を表示。

### UI

`FilterBar` のピル/チップの見た目（ブランド紫・角丸）を**踏襲**しつつ、配置はドキュメントフロー（`absolute` 浮遊なし）。検索ボックスはリード文直下、ファセットチップはその下に横並び。既存 design language（Req 6.1）に準拠。

### 影響範囲

クライアント専用に閉じ、`generateStaticParams` / `generateMetadata` / JSON-LD（全店対象の ItemList）・サイトマップには手を入れない（Req 8.8）。閾値未満の県と全ハブページは無変更。

---

## Error Handling

- `getAreaForPrefecture(slug)` が `null`（未知スラッグ・店舗0）→ 県ページは `notFound()`（404）
- `machineCounts` 欠落 → 台数バッジを出さない（行は表示）
- `storesMeta.lastUpdated` 欠落 → 最終更新日表示を省略（既存 `LastUpdated` と同方針）
- スラッグ表に対応の無い都道府県が `stores` に出現 → ビルド時テストで失敗させる（後述）

---

## Testing Strategy

- `lib/prefecture-slug.test.ts`: `PREFECTURE_SLUGS` のキー集合が `PREFECTURES` と完全一致／スラッグ重複なし／双方向変換の整合
- `lib/area.test.ts`: `closed`/`delisted` 除外、複数タイトル店が両セクションに計上、`countByGame` と一覧件数の一致、都道府県名・店名ソート順
- `sitemap.test.ts`（既存があれば拡張）: `/area` と全県 URL を含む／件数が `getAreaPrefectures()` と一致
- 県ページの `generateStaticParams` が全スラッグを返すこと
- 既存の地図・フィルタ・検索系テストが緑のまま（影響ゼロの確認）
- `AreaStoreFilter.test.tsx`: フリーテキスト（店名・住所一致）／設備ファセット（最低台数・配信・録画・喫煙）の絞り込み結果、可視0セクションの見出し非表示、全0件の空状態表示、初期 state での全件描画（JS非依存の担保）
- 閾値ゲート: `total >= AREA_SEARCH_MIN_STORES` の県のみ検索UIを描画し、未満は静的セクションのみ（`AreaStoreFilter` を描画しない）こと
- 一致規則の地図との一致: `filterStoresByKeyword` / `filterStoresByFacility` を共有し、エリア側で再実装しないこと（純関数の再利用を確認）

---

## Migration / Rollout

1. `lib/prefecture-slug.ts` / `lib/area.ts`（＋テスト）を追加
2. `/area/[pref]` と `/area` を追加（SSG）
3. `sitemap.ts` を拡張
4. `SeoContent.tsx` の全店リストを撤去（最後。新ページが揃ってから隠しリストを外す）
5. デプロイ後、Search Console でサイトマップ再送信・対象クエリの掲載順位を観測
