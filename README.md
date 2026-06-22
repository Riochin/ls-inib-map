# ラストサバイニブ（ジョジョLS × EXVS マップ）

> **戦場選びをサクッと10秒に。**

<img width="1376" height="768" alt="image" src="https://github.com/user-attachments/assets/6a8279c9-e9a3-487f-9bca-eaab710cdc29" />


[![Deploy](https://img.shields.io/badge/demo-Vercel-black)](https://ls-inib-map.vercel.app/)

ラスサバ（ジョジョの奇妙な冒険 ラストサバイバー）とイニブ（機動戦士ガンダム EXTREME VS.2 INFINITEBOOST）の設置店舗を地図上で検索できる Web アプリです。**全国 47 都道府県・約 760 店舗**を、公式サイトから自動更新しています。

**🔗 https://ls-inib-map.vercel.app/**

> 個人開発の非公式アプリです。投稿の際はハッシュタグ [**#ラストサバイニブ**](https://x.com/hashtag/%E3%83%A9%E3%82%B9%E3%83%88%E3%82%B5%E3%83%90%E3%82%A4%E3%83%8B%E3%83%96) をぜひ。

## 主な機能

- **地図表示**: Google Maps 上に設置店舗を表示（全国対応）
- **マーカークラスタリング**: 多数のピンも近接店舗を束ねて軽快に描画。タップ／ズームで個別展開（イニブのみのクラスタは青、ラスサバを含むクラスタは紫）
- **タイトル別フィルタ**: ラスサバ / イニブ / すべて
- **キーワード検索**: 店舗名で検索し、選択すると地図がその店舗へフォーカス
- **エリア絞り込み**: 都道府県・市区町村で階層フィルタ
- **現在地取得**: 現在地へ移動（位置情報はブラウザ内のみで使用・サーバー送信なし）
- **情報提示**: 掲載店舗数・絞り込み件数・データ最終更新日時・出典クレジットを表示
- **オンボーディング**: 初回アクセス時に使い方を案内（3 ページ）。常設の「?」ボタンでいつでも再表示
- **X 共有**: ハッシュタグ・本文をプリフィルしてポスト
- **モバイルファースト**・レスポンシブ対応、OGP メタデータ対応

### ピンの色分け

| ピン | 意味 |
|------|------|
| 🟣 紫 | 両タイトル（ラスサバ＆イニブ） |
| 🔵 青 | イニブのみ |
| ⚪ グレー | 移設の可能性（公式一覧から消えた店舗） |
| 🌸 | 閉店 |

## アーキテクチャ

2 つの独立した境界が、生成物 `src/data/stores.json` という**データ契約**のみで結合します。

- **(B) クライアント地図描画** (`src/`): 生成済み静的データを read-only で読み込み、命令的にクラスタ描画する Next.js アプリ。
- **(A) ビルド前データ生成パイプライン** (`scripts/`): 公式サイトをスクレイプ → 住所正規化・マージ → ジオコーディング → JSON 生成。ランタイムには API サーバー・DB を持たず、データ鮮度はオフライン実行のパイプラインで担保します。

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript (strict) |
| 地図 | Google Maps JavaScript API / [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/) |
| クラスタリング | [@googlemaps/markerclusterer](https://github.com/googlemaps/js-markerclusterer) |
| スタイル | Tailwind CSS 4 |
| テスト | Vitest |
| データ生成 | tsx / node-html-parser / Google Geocoding API |
| ホスティング | Vercel |

## セットアップ

### 環境変数

```env
# アプリ（地図表示）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-map-id

# データ生成パイプライン用（地図表示用とは別キーを推奨）
GOOGLE_GEOCODING_API_KEY=your-geocoding-api-key

# ユーザー報告フォーム（/api/report → GitHub Issue）用・サーバー専用
# fine-grained PAT（対象リポジトリのみ・Issues:write のみ＝最小権限）を推奨
GITHUB_REPORT_TOKEN=your-github-fine-grained-pat
GITHUB_REPORT_REPO=owner/repo
```

> `GITHUB_REPORT_*` は本番（Vercel）の環境変数にも登録する。未設定だと報告フォームは 503 を返す（送信不可）。
> 報告は `ユーザー報告` ラベルの Issue として作成され、運営が確認して反映する（自動構造化はしない）。

### インストール・起動

```bash
npm install
npm run dev        # 開発サーバー起動 (http://localhost:3000)
```

### コマンド

```bash
npm run build      # プロダクションビルド
npm start          # プロダクションサーバー起動
npm test           # テスト実行（Vitest）
npm run test:watch # テスト（watch モード）
```

## データ更新パイプライン

設置店舗データは公式 2 サイト（[ラスサバ](https://bandainamco-am.co.jp/am/vg/jojols/location/) / [イニブ](https://gundam-vs.jp/extreme/ac2ib/location/)）から取得し、`src/data/stores.json` を生成します。

```bash
npx tsx scripts/pipeline.ts
```

処理の流れ:

1. **スクレイプ** (`scrape.ts`): 全都道府県（JP-01〜47）の地域別一覧を取得・DOM 抽出。取得失敗・件数異常時は非破壊で中断。
2. **マージ** (`merge.ts`): 両サイトを正規化住所キーで統合し、提供タイトルを合成。正規化住所から決定論的 ID を採番。公式一覧から消えた店舗は削除せず「移設の可能性（delisted）」として保持。
3. **ジオコーディング** (`geocode.ts`): `scripts/cache/geocode.json` のキャッシュを優先し、未ヒットの住所のみ Google Geocoding へ問い合わせ。
4. **生成・差分ゲート** (`generate.ts`): 最終更新日時（`lastUpdated`）・出典を埋め込んだ JSON を生成。最終更新日時を除いた実体差分が無ければ書き込まない。

アプリ側はこの生成物を静的データとしてバンドル・CDN エッジ配信します（ランタイム DB 非採用）。

## プロジェクト構成

```
src/
├── app/              # Next.js App Router（page.tsx ほか）
├── components/       # UI コンポーネント（MapView, FilterBar, Onboarding, StoreCount ...）
├── hooks/            # use-store-clusterer / use-geolocation
├── lib/              # 純関数（filter, address-parser, marker-color, marker-image, info-display ...）
├── data/             # stores.json（生成物）＋ 薄いローダ stores.ts
└── types/            # 共有型（store, stores-file）

scripts/              # ビルド前データ生成パイプライン（scrape → merge → geocode → generate）
```

ロジックは純関数として `src/lib/` に分離し、コンポーネントは単一責任を保ちます（パスエイリアス `@/` = `src/`）。

## 新しいゲームタイトルを追加するには（開発者向け）

タイトルは `GameTitle`（`src/types/store.ts`）を中心に各所が結合しています。新タイトル（例 `new-title`）を追加する場合、おおむね以下を編集します。**台数・録画台・配信台などは `Partial<Record<GameTitle, …>>` で持つため、ほとんどの表示は `store.games` をループして自動拡張されます**。手当てが要るのは「2タイトル前提でハードコードされた箇所」です。

1. **型** — `src/types/store.ts` の `GameTitle` に ID を追加。`FilterOption`（= `'all' | GameTitle`）は自動拡張。
2. **ゲーム一覧の定数** — `src/lib/apply-overrides.ts` の `GAME_TITLES` 配列に追加（`machineCounts`・`hasRecordingByGame`・`hasStreamingByGame` のマージ対象になる）。
3. **ラベル/色（要ロック解除）** — `src/lib/marker-color.ts`
   - `getGameLabel()` は現在2タイトル前提の三項式。新タイトルの表示名を返すよう分岐を見直す（引数型 `'jojo-ls' | 'gundam-exvs'` も `GameTitle` へ）。
   - `THEMES` / `getThemeKey()` のピン色は `both` / `gundamOnly` の2値前提。タイトルの組み合わせ表現を拡張する。
4. **フィルタ UI** — `src/components/FilterBar.tsx` の `FILTERS` にチップを追加。`ACTIVE_BG_COLORS`（`Record<FilterOption, string>`）は型で追加を強制されるので色も定義。
5. **提供フォーム** — `src/components/StoreInfoForm.tsx` は `hasJojo` / `hasGundam` のように**タイトルごとにハードコード**。新タイトルの state・入力（台数／録画台／配信台）・送信ペイロードキー（`machineCounts<Title>` 等）を追加。
6. **投稿パイプライン** — `src/lib/report.ts`（`StructuredStoreInput` の flat key と Issue 行）と `src/app/api/report/route.ts`（検証）に新タイトルのキーを追加。
7. **データ生成** — `scripts/scrape.ts` の `SOURCES` / `ALL_SITES` / `SiteKey` に公式サイト取得元を追加し、`scripts/merge.ts` のタイトル合成を確認 → `npx tsx scripts/pipeline.ts` で `src/data/stores.json` を再生成。

> 目安：**`Record<GameTitle, …>` を使う箇所は TypeScript がキー追加を強制**してくれます（漏れに気づける）。一方 `getGameLabel` / `getThemeKey` / `StoreInfoForm` の 2タイトル前提ロジックはコンパイラで検出されないため、手動での見直しが必須です。`pnpm exec tsc --noEmit` と `pnpm test` で検証してください。

## ライセンス / 免責

ファン制作の非公式サービスであり、株式会社バンダイナムコアミューズメント等の権利者とは一切関係ありません。店舗データは各公式サイトをもとにしていますが、最新の状況と異なる場合があります。実際の稼働状況は各店舗へご確認ください。
