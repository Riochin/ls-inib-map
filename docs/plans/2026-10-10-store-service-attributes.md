# ver2.6 店舗サービス情報の拡充 実装計画（ファイル計画）

> **位置づけ:** 実装前の計画。どのファイルを、どの順で、どのコミットで触るかを先に固定する。手順レベル（テスト→実装→コミット）は実装開始時に plan mode で詰め、承認後にこの文書を更新する。設計で判断が変わったら、この文書を先に直す。

**Goal:** 無制限台（ゲーム別三値＋台数）、クレジットサービス・貸切（ゲーム別三値＋ゲーム別自由記述）を店舗情報に追加し、「無制限台あり」で絞り込めるようにする。先に店舗属性の定義を1か所に集約し、以後の属性追加を小さくする。

**Architecture:** `src/lib/store-attributes.ts` に属性レジストリ（キー・ラベル・店単位/ゲーム別・種類・上限・付随フィールド・充実度/絞り込みフラグ）を置き、報告入力型・API 検証・Issue 提案値表・オーバーライド適用・詳細表示・充実度をそこから導出する。`Store` / `OverrideEntry` のフィールド名、`overrides.json`、Issue 本文のラベル文字列は変えない。フォームの見た目は手で書く。

**関連:** ADR-0002（無制限台）、ADR-0003（店のサービス）、ADR-0004（折りたたみ）、ADR-0005（属性レジストリ）、Issue #31、#35、[画面モック](https://claude.ai/artifact/8bxiJxzwSEPmRtxZvertLy)

## Global Constraints

- 既存データ非破壊: `src/data/overrides.json` と `stores.json` は変更しない。既存の Issue 本文のラベル（「録画台（ラスサバ）」等）も変えない
- 挙動不変のリファクタ（フェーズA）は、Issue 本文のスナップショットと既存テスト 58 ファイルで確認してから次へ進む
- UI 文言は平易な日本語。用語の説明文（ヒント）は付けない。「クレサ」は「クレジットサービス」と書く（メモリ「UIはノンテック層前提」）
- 確定/未確認は `admin` のみ確定（`isConfirmedSource`）。自由記述は確定/未確認の対象外で中立表示
- フォームの見出しに `HEADING_FONT_STYLE` を使うなら `src/app/layout.tsx` の `&text=` サブセットに文字を追加する（現状の項目見出しはシステムフォントなので原則不要）
- パッケージ操作は pnpm のみ。push 前に `pnpm exec tsc --noEmit` と `pnpm test` と `pnpm lint`
- コミットはフェーズ内の論理単位で分け、末尾に `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`。PR タイトルは `ver2.6`
- dev / preview サーバーはこちらで起動しない

## ファイル計画

### フェーズA: 属性レジストリ導入（挙動を変えないリファクタ）

| 操作 | ファイル | 責務 |
|---|---|---|
| Create | `src/lib/store-attributes.ts` | 属性定義の正本。`AttributeKey`、`scope: 'store' \| 'game'`、`kind: 'ternary' \| 'text' \| 'number' \| 'list'`、上限、付随フィールド（台数・文章）、`countsForCompleteness`、`filterable`。既存7属性（営業時間・フロア・喫煙所・決済・録画台・配信台・公式URL）をまず登録 |
| Create | `src/__tests__/store-attributes.test.ts` | レジストリのキーが `Store` と `OverrideEntry` の両方に存在することの型レベル検査、ラベル重複なし、ゲーム別属性の型が `Partial<Record<GameTitle, …>>` であること |
| Modify | `src/types/store.ts` | `StoreAttributeKey` をレジストリのキーから導出。`Store` インターフェース自体は明示のまま |
| Modify | `src/types/overrides.ts` | 変更なしが理想。レジストリとの整合はテスト側で検査 |
| Modify | `src/lib/apply-overrides.ts` | `ATTRIBUTE_KEYS` 配列と `hasRecordingByGame` 等の個別 if をレジストリ走査に置換（`store` → 代入、`game` → `mergeByGame`、出どころは属性キー単位） |
| Modify | `src/lib/report.ts` | `StructuredStoreInput` のゲーム別平坦フィールド（`hasRecordingJojoLs` 等）を `attributes`（`OverrideEntry` と同じ形）へ。`buildStructuredStoreIssue` の行生成をレジストリ走査に。「両ゲーム同値なら1行」規則を全ゲーム別属性へ一般化 |
| Modify | `src/app/api/report/route.ts` | `validateStructuredStore` を種類と上限による汎用検証に置換。「全属性未入力なら拒否」はレジストリ走査で判定 |
| Modify | `src/components/StoreInfoForm.tsx` | 送信ペイロードを新しい形で組む。見た目は変えない |
| Modify | `src/components/StoreDetailPanel.tsx` | 属性行の描画をレジストリ順の走査に。`AttributeRow` は維持 |
| Modify | `src/lib/info-display.ts` | ゲーム別三値の整形関数を、台数・文章の付随フィールドを受け取れる形に拡張（フェーズB・Cの下準備。この段階では呼び出し側は未使用） |
| Modify | `src/lib/completeness.ts` | `countsForCompleteness` の属性だけ数える。項目数7・閾値は不変 |
| Test | `src/__tests__/report.test.ts` | リファクタ前の Issue 本文をスナップショットとして固定し、前後で一致させる |
| Test | `src/__tests__/apply-overrides.test.ts`、`completeness.test.ts`、`store-detail-panel.test.tsx`、`store-info-form.test.tsx` | 既存テストが無修正で通ることを確認。入力型の変更で直す箇所は送信ペイロードの形のみ |

**コミット分割:** (1) レジストリと型・テスト (2) オーバーライド適用の置換 (3) 報告入力型・Issue 本文・API 検証・フォーム送信の置換 (4) 詳細表示・充実度の置換

### フェーズB: 無制限台（ADR-0002・Issue #31）

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/lib/store-attributes.ts` | `hasUnlimitedByGame`（ゲーム別三値、ラベル「無制限台」、付随 `unlimitedCountByGame`、充実度は録画台と同じ「台の設備」グループ、`filterable`） |
| Modify | `src/types/store.ts`、`src/types/overrides.ts` | `hasUnlimitedByGame?`、`unlimitedCountByGame?` を追加（`StoreAttributeKey` はレジストリ導出なので自動） |
| Modify | `src/components/StoreInfoForm.tsx` | 配信台の下に「無制限台」ブロック（録画台と同じ2列）。「あり」のときだけ台数欄。説明文なし |
| Modify | `src/lib/info-display.ts`、`src/components/StoreDetailPanel.tsx` | 「イニブ あり・4台（未確認）」の整形と行追加（レジストリ順で自動追加されるはず。整形だけ確認） |
| Modify | `src/types/store.ts`（`FacilityFilter`）、`src/lib/facility-filter.ts`、`src/lib/filter.ts`、`src/lib/filter-storage.ts`、`src/lib/filter-summary.ts` | `hasUnlimited` 条件。選択中ゲームでスコープ（録画台と同じ） |
| Modify | `src/components/AddressFilterModal.tsx`、`src/components/area/AreaStoreFilter.tsx` | 「無制限台あり」のチェック／チップを追加 |
| Modify | `src/lib/analytics.ts` | 絞り込みイベントに `has_unlimited` |
| Modify | `scripts/override-tweet-draft.mjs` | お礼ツイート下書きの対象フィールドに追加 |
| Test | `src/__tests__/facility-filter.test.ts`、`filter-storage.test.ts`、`filter-summary.test.ts`、`store-filter-modal.test.tsx`、`report.test.ts`、`apply-overrides.test.ts`、`store-info-form.test.tsx` | 無制限台の有無・台数・絞り込み・Issue 行（「無制限台（イニブ）」「無制限台 台数（イニブ）」の2行） |

**コミット分割:** (5) 無制限台のデータ・フォーム・表示 (6) 絞り込み「無制限台あり」

### フェーズC: 店のサービス（ADR-0003・Issue #35）

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/lib/store-attributes.ts` | `creditServiceByGame` / `rentalByGame`（ゲーム別三値、ラベル「クレジットサービス」「貸切」、付随 `creditServiceNoteByGame` / `rentalNoteByGame`（各100文字）、充実度には数えない、絞り込み不可） |
| Modify | `src/types/store.ts`、`src/types/overrides.ts` | 4フィールド追加 |
| Modify | `src/components/StoreInfoForm.tsx` | 「店のサービス」セクション。2列に詰めず「ラスサバ、内容、イニブ、内容」の縦積み。「あり」の列だけ内容欄 |
| Modify | `src/components/StoreDetailPanel.tsx` | 設備一覧の下に「店のサービス」の枠。行の下にゲーム名つきの内容を1行ずつ（片方だけの店はゲーム名なし） |
| Modify | `src/lib/info-display.ts` | ゲーム別自由記述の整形 |
| Test | `report.test.ts`、`apply-overrides.test.ts`、`store-detail-panel.test.tsx`、`store-info-form.test.tsx` | 三値と文章の往復、Issue 行（「クレジットサービス（イニブ）」「クレジットサービス 内容（イニブ）」） |

**コミット分割:** (7) 店のサービスのデータ・フォーム・表示

### フェーズD: 提供フォームの折りたたみ（ADR-0004）

| 操作 | ファイル | 責務 |
|---|---|---|
| Create | `src/components/FoldSection.tsx` | 見出し（タイトル・登録済み・要約・開閉矢印）＋本文の折りたたみ部品。`aria-expanded` / `aria-controls`。見た目は `AddressFilterModal` の `renderAccordionHeader` にそろえる |
| Modify | `src/components/StoreInfoForm.tsx` | 決済を無制限台の下へ移し `FoldSection` で包む。店のサービスも `FoldSection`。初期は閉。要約文（「未入力」「3件選択」「クレジットサービス あり（イニブ）」） |
| Test | `src/__tests__/store-info-form.test.tsx`、新規 `fold-section.test.tsx` | 初期閉・クリックで開く・要約文・登録済み表示 |

**コミット分割:** (8) 折りたたみ部品とフォームの並び替え

### フェーズE: 運用・文書

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `.github/workflows/reflect-user-reports.yml` | 指示文に新属性名を追記。自由記述は「SNS ID 等を除いた中立な1文に整え、ゲーム別の専用欄へ。`remarks` には入れない」。提案値表のラベルとフィールド名の対応は `src/lib/store-attributes.ts` を読むよう指示 |
| Modify | `docs/adr/README.md` | 状態の更新があれば |
| Verify | `src/app/admin/overrides/OverridesAdmin.tsx` | 台数以外の属性は項目別 UI を持っていない（確認済み）。追加不要。JSON 直接編集で対応 |

**コミット分割:** (9) 自動反映ワークフローの指示文 (10) 文書の仕上げ（計画の「実装後の変更」・ADR の状態）

## 実行順と確認

1. フェーズA → `pnpm test` 全通過、`report.test.ts` のスナップショット一致、`pnpm exec tsc --noEmit`
2. フェーズB → フェーズC → フェーズD。各フェーズ末で `pnpm test`、`pnpm lint`
3. フェーズE → `pnpm exec tsx scripts/validate-overrides.ts`（既存データが壊れていないこと）
4. PR `ver2.6` を作成。マージ後に告知チェックリスト Issue が立つので、無制限台の絞り込みを告知の目玉にする
5. マージ後、自動反映ワークフローを手動 dispatch して新属性の反映を1件確認する（main に載るまで検証できない既知の制約）

## 未決事項

- フェーズAで `StructuredStoreInput` の形を変えると、デプロイ直前に開いていたタブからの送信は失敗する。旧形式を一定期間受け付けるかは実装開始時の plan mode で決める（現状案: 受け付けない。頻度が低い）
- 充実度の「台の設備」グループに無制限台を含めると、無制限台だけ報告された店も1項目分加算される。録画台・配信台と同じ扱いなので許容する想定
