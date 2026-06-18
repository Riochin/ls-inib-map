# ギャップ分析レポート — store-info-contribution (ver2.3)

> 生成日: 2026-06-16  
> フェーズ: requirements-generated（要件承認前）  
> 言語: ja

---

## 分析サマリー

- **既存パイプライン（`/api/report`・`buildReportIssue`）は共通基盤として再利用可能**。ただし現在は `type` 選択式（4種）前提の単一ペイロードであり、構造化フォームとアプリ要望の2モードを扱えるよう拡張が必要。
- **`Store` 型と `OverrideEntry` に新属性（営業時間・フロア・喫煙所・決済・録画台・配信台）が存在しない**。データモデルの型拡張と `applyOverrides` の改修が必須。
- **店舗詳細モーダルの基盤がない**。既存は Google Maps `InfoWindow`（小さいクイック表示のみ）で、ボトムシート／PC中央モーダルへの展開機能はゼロから実装する必要がある。最大の開発ボリューム。
- **Onboarding の「店舗情報の修正・提供」（X投稿インテント）**は `AboutPage` 内に実装済みで、廃止・差し替えが必要な箇所は特定済み。
- **実装難度は L（1〜2週間）・リスク中**。ボトムシートUIと Google Maps InfoWindow の状態管理連携が最大の未確認技術要素。

---

## 1. 現状コードベース調査結果

### 1-1. 関連アセット一覧

| アセット | パス | 役割 |
|---|---|---|
| `/api/report` ルート | `src/app/api/report/route.ts` | Issue起票エンドポイント |
| 報告ロジック | `src/lib/report.ts` | `REPORT_TYPES`・`buildReportIssue`・型定義 |
| 報告フォーム | `src/components/ReportModal.tsx` | 種別選択式フォームUI |
| 地図ビュー | `src/components/MapView.tsx` | `InfoWindowContent`（クイック表示）を内包 |
| オンボーディング | `src/components/Onboarding.tsx` | チュートリアル・`AboutPage`に X インテント |
| Store型 | `src/types/store.ts` | `Store`・`Provenance`・`FilterOption` |
| Override型 | `src/types/overrides.ts` | `OverrideEntry`・`OverridesFile` |
| Override適用 | `src/lib/apply-overrides.ts` | `applyOverrides`・`applyEntry` |
| 店舗データローダ | `src/data/stores.ts` | `stores`・`storesMeta`（read-only） |

### 1-2. 既存の荒らし対策（継承対象）

- **honeypot** フィールド（`website`）: bot が値を入れると静かに廃棄（ステータス 200 を返す）
- **`neutralizeMentions`**: `@` `#` の後にゼロ幅スペースを挿入
- **文字数上限**: `MAX_TEXT=2000`, `MAX_NAME=80`, `MAX_STORE_FIELD=200`

### 1-3. 既存 `Provenance` / `countSources` 設計

`Store.countSources: Partial<Record<GameTitle, Provenance>>` がゲーム別台数の出どころを保持する設計が確立済み。新属性も同パターンで拡張する。

---

## 2. 要件別ギャップマップ

### Req1 — 共通投稿パイプライン拡張

| 要件項目 | 現状 | ギャップ | 分類 |
|---|---|---|---|
| GitHub Issue 起票 | ✅ 実装済み | — | — |
| Honeypot | ✅ 実装済み | — | — |
| `@`/`#` 無効化 | ✅ 実装済み | — | — |
| 環境変数未設定エラー | ✅ 実装済み | — | — |
| SNS ID provenance 判定 | ✅ 実装済み | — | — |
| 文字数上限 | ✅ 実装済み（既存フィールド） | 新フィールド（各属性値）に上限追加が必要 | Missing |
| 複数投稿モード（構造化 / アプリ要望） | ❌ なし | `type` ホワイトリストが4種固定。モード別のペイロードと Issue テンプレートが必要 | Missing |
| アプリ要望用 Issue ラベル | ❌ なし | `ユーザー報告` とは別ラベル（例: `アプリ要望`）が必要 | Missing |

**変更が必要なファイル**: `src/lib/report.ts`（型・テンプレート）、`src/app/api/report/route.ts`（バリデーション拡張）

---

### Req2 — アプリ要望フォーム（オンボーディング差し替え）

| 要件項目 | 現状 | ギャップ | 分類 |
|---|---|---|---|
| オンボーディング `AboutPage` の X インテントリンク | ✅ 存在確認（`Onboarding.tsx:284-297`） | 廃止して要望フォーム導線に差し替える | Missing |
| アプリ要望フォーム UI | ❌ なし | 種別（新機能/改善/不具合/その他）＋自由記述＋SNS ID の新コンポーネント | Missing |
| 共通パイプライン経由での Issue 化 | ❌ なし | `REPORT_TYPES` に `app-feedback` モード追加 or 別エンドポイント | Missing |
| 内容空欄バリデーション | ✅ 既存 `ReportModal` に同パターン | 新フォームへ移植 | Missing |

**変更が必要なファイル**: `src/components/Onboarding.tsx`（`AboutPage` 差し替え）  
**新規ファイル候補**: `src/components/AppFeedbackModal.tsx`

---

### Req3 — 店舗モーダル拡大表示

| 要件項目 | 現状 | ギャップ | 分類 |
|---|---|---|---|
| クイック表示（`InfoWindowContent`） | ✅ 実装済み | 「詳細を見る」CTA 追加のみ必要 | Missing（軽微） |
| モバイル：ボトムシート/全画面展開 | ❌ なし | 新実装が必要。コードベースにボトムシート基盤なし | Missing |
| PC：中央モーダル展開 | ❌ なし | 新実装が必要 | Missing |
| 全属性表示（営業時間〜配信台） | ❌ なし | データモデル拡張後に表示 | Missing |
| 未登録属性の「未登録」表示 | ❌ なし | 新実装 | Missing |
| 閉じると地図へ戻る | ✅ InfoWindow の close 機構が流用可 | 展開中の詳細モーダル Close で InfoWindow も閉じる連携が必要 | Missing |
| 既存の経路・シェア・更新日表示維持 | ✅ 実装済み | 詳細表示でも引き継ぐ | Missing（移植） |

**変更が必要なファイル**: `src/components/MapView.tsx`（詳細トリガー CTA 追加・状態リフトアップ）  
**新規ファイル候補**: `src/components/StoreDetailPanel.tsx`  
**要調査**: ボトムシートライブラリ（`vaul` 等）vs CSS-only 実装

---

### Req4 — 構造化提供フォーム（type式廃止）

| 要件項目 | 現状 | ギャップ | 分類 |
|---|---|---|---|
| 種別選択式フォーム（`ReportModal`） | ✅ 存在 | 廃止・置換 | Missing |
| 全属性一覧表示・現在値プリポピュレート | ❌ なし | 各属性フィールド + 現在値初期表示ロジック | Missing |
| 台数（ゲーム別）入力 | ❌ なし（現在は自由記述） | ゲーム別数値入力 | Missing |
| 営業時間入力 | ❌ なし | テキスト入力 or 構造化 | Missing |
| フロア入力 | ❌ なし | テキスト入力 | Missing |
| 喫煙所・録画台・配信台（あり/なし/不明） | ❌ なし | 3値ラジオ/セレクト | Missing |
| 決済/電子マネー（複数選択） | ❌ なし | チェックボックスグループ | Missing |
| 位置ズレ・閉店/移設をフォーム下部に配置 | ❌ なし | 同フォーム内に組み込み（既存4種のうち「位置ズレ」「閉店・移設」を移設） | Missing |
| 一部項目のみ送信 | ❌ なし | 空欄スキップ + 全空送信バリデーション | Missing |
| 項目別提案値一覧として Issue 整形 | ❌ なし | `buildStructuredStoreIssue` 相当の関数 | Missing |

**変更が必要なファイル**: `src/lib/report.ts`（テンプレート追加）、`src/app/api/report/route.ts`  
**新規ファイル候補**: `src/components/StoreAttributeForm.tsx`  
**廃止予定**: `ReportModal.tsx` の種別セレクト部分（または全体を差し替え）

---

### Req5 — 店舗属性データモデルと出どころ表示

| 要件項目 | 現状 | ギャップ | 分類 |
|---|---|---|---|
| `Provenance` 型 | ✅ 定義済み | — | — |
| `countSources` パターン | ✅ 実装済み | 新属性の provenance にも同パターン適用 | Missing |
| 新属性フィールド（`Store` 型） | ❌ なし | `hours?`, `floor?`, `smoking?`, `payment?`, `recordingCabinets?`, `streamingCabinets?` の追加 | Missing |
| 新属性の provenance フィールド | ❌ なし | `attributeSources?: Partial<Record<新属性キー, Provenance>>` 相当 | Missing |
| 未確認属性の視覚表現 | ❌ なし | 詳細モーダルで未確認マーク表示 | Missing |
| 既存 `machineCounts/countSources` との整合 | ✅ 確認 | 型拡張は後方互換（optional フィールド追加） | Constraint |

**変更が必要なファイル**: `src/types/store.ts`、`src/types/overrides.ts`

---

### Req6 — 管理者レビューによる反映

| 要件項目 | 現状 | ギャップ | 分類 |
|---|---|---|---|
| 手動オーバーライド層 | ✅ `overrides.json`・`applyOverrides` 実装済み | — | — |
| `infoUpdatedAt` 更新 | ✅ `OverrideEntry.updatedAt` → `Store.infoUpdatedAt` 実装済み | — | — |
| 新属性の `OverrideEntry` フィールド | ❌ なし | `OverrideEntry` に新属性フィールド追加が必要 | Missing |
| `applyEntry` 新属性適用 | ❌ なし | `applyEntry` に新属性コピー処理追加が必要 | Missing |
| 属性 provenance を `admin` として記録 | ❌ なし | `applyEntry` で `attributeSources[attr] = entry.source` を設定 | Missing |
| ランタイム書き込みなし（静的データ方針） | ✅ 維持済み | — | — |

**変更が必要なファイル**: `src/types/overrides.ts`、`src/lib/apply-overrides.ts`

---

## 3. 実装アプローチ選択肢

### Option A — 既存コンポーネント拡張

既存の `ReportModal`・`MapView`・`Onboarding` を内側から拡張する。

- ✅ 新規ファイルが少ない
- ❌ `MapView.tsx`（273行）に詳細モーダル状態管理を追加するとコンポーネントが肥大化
- ❌ `ReportModal`（190行）を構造化フォームに完全改修すると実質的な全書き換えになる
- ❌ `Onboarding.tsx`（664行）への追加が可読性を下げる

→ **小規模変更には向くが、今回の規模では単一責任原則を損なうリスクが高い**

---

### Option B — 新規コンポーネント主体

すべて新規ファイルで作成し、既存への変更を最小化する。

- ✅ 各コンポーネントが独立してテスト可能
- ✅ 既存機能を壊しにくい
- ❌ 新旧コンポーネント間のインターフェース設計が煩雑になる可能性
- ❌ `MapView.tsx` の詳細トリガー起点は既存コードへの変更が避けられない

→ **単体ではやや過剰。中規模変更の並走には向く**

---

### Option C — ハイブリッド（推奨）

既存への「最小限の変更」＋「独立した新コンポーネント」を組み合わせる。

**既存への変更（最小限）**:
- `src/lib/report.ts`: 新ペイロード型・Issue テンプレート関数追加
- `src/app/api/report/route.ts`: 新モード対応バリデーション追加
- `src/types/store.ts`: 新属性・provenance フィールド追加（optional）
- `src/types/overrides.ts`: `OverrideEntry` に新属性フィールド追加
- `src/lib/apply-overrides.ts`: 新属性の `applyEntry` 処理追加
- `src/components/MapView.tsx`: `InfoWindowContent` に「詳細を見る」CTA 追加・`StoreDetailPanel` 状態リフトアップ
- `src/components/Onboarding.tsx`: `AboutPage` の X インテント部分を `AppFeedbackModal` 起動ボタンに差し替え

**新規ファイル（明確な責任分離）**:
- `src/components/StoreDetailPanel.tsx`: ボトムシート（モバイル）／中央モーダル（PC）の詳細表示
- `src/components/StoreAttributeForm.tsx`: 構造化提供フォーム（旧 `ReportModal` の実質的な後継）
- `src/components/AppFeedbackModal.tsx`: アプリ要望フォーム

- ✅ 既存の荒らし対策・パイプラインを継承し、追加分のみ書く
- ✅ 大規模コンポーネントを肥大化させない
- ✅ 各新コンポーネントが独立してテスト可能
- ❌ ファイル数が増える（ただし責任分離の観点では妥当）

---

## 4. 複雑度・リスク評価

| 要件 | 工数見積 | リスク | 根拠 |
|---|---|---|---|
| Req1（APIパイプライン拡張） | S | Low | 既存パターンに型とテンプレート追加のみ。テスト（`report-route.test.ts`）あり |
| Req2（アプリ要望フォーム） | S〜M | Low | 新コンポーネント1本 + Onboarding の1セクション差し替え |
| Req3（店舗詳細モーダル） | L | **Medium** | ボトムシート UI の未実装・Google Maps InfoWindow との状態管理連携・レスポンシブ対応 |
| Req4（構造化提供フォーム） | M | Low | 多フィールドだが型安全な実装パターンは明確 |
| Req5（データモデル拡張） | S〜M | Low | optional フィールド追加のみ・後方互換 |
| Req6（管理者反映層） | S | Low | 既存 `applyOverrides` パターンへの追記 |
| **合計** | **L（1〜2週間）** | **Medium** | Req3 が最大ボトルネック |

---

## 5. 要調査事項（設計フェーズへ持ち越し）

| # | 調査項目 | 優先度 |
|---|---|---|
| R1 | **ボトムシートの実装方針**: `vaul`（Radix ベース）等ライブラリ導入 vs CSS-only（`transform/transition`）。アニメーション品質とバンドルサイズのトレードオフ | 高 |
| R2 | **Google Maps InfoWindow と詳細モーダルの状態連携**: `InfoWindow` の `onClose` と `StoreDetailPanel` の open/close を一貫して管理する設計。`MapView` のステートリフトアップ範囲の確定 | 高 |
| R3 | **決済/電子マネーの選択肢リスト**: Suica/PASMO/PayPay/交通系 etc. — アーケード向けの具体的な選択肢セットの確定 | 中 |
| R4 | **構造化フォームの各属性の入力 UI 詳細**: 営業時間をフリーテキストにするか時間帯ピッカーにするか | 中 |
| R5 | **`stores.json` の新属性移行**: 既存データに新フィールドが無い状態でビルドが壊れないことの確認（TypeScript optional で問題なし見込みだが要確認） | 低 |

---

## 次のステップ

1. **要件の承認**: requirements.md が未承認（`approved: false`）のため、内容確認後に承認する
2. **設計フェーズへ移行**: `/kiro:spec-design store-info-contribution` を実行
   - 上記 R1（ボトムシート）・R2（状態管理）の調査結果を設計に組み込む
   - Option C（ハイブリッド）を基本方針として、具体的なファイル構成とインターフェースを確定する
