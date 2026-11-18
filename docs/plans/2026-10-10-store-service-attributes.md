# ver2.6 店舗サービス情報の拡充 実装計画（ファイル計画）

## 実装後の変更

計画どおり10コミット（計画・レジストリ・各層の置換・無制限台・絞り込み・店のサービス・折りたたみ・指示文・文書）で入れた。違いは次のとおり。

- **ファイルが2つ増えた。** 折りたたみ見出しの要約文は `src/lib/form-summary.ts`（`summarizePayments` / `summarizeServices`）に切り出した。`GAME_TITLES`・`TERNARY_VALUES`・`TERNARY_LABELS` は `src/lib/store-attributes.ts` に置き、`apply-overrides.ts`・`route.ts`・`info-display.ts` の重複定義を消した
- **テストの直しが1ファイル増えた。** `rate-limit-route.test.ts` も送信ペイロードの形だけ直した。フェーズAでは置換前後の一致を、Issue 本文のインラインスナップショットに加えて、実データ（`overrides.json`・全店舗）で「オーバーライド適用結果」「詳細モーダルの HTML」「充実度」が置換前と一致することを一時テストで確かめた（コミットには含めていない）
- **無制限台の台数はフォーム側で 1〜99 の整数だけ送る。** 範囲外を送ると API が 400 を返して報告全体が失敗するため、範囲外の台数は送らず、他の項目だけ届くようにした。店のサービスの内容も、そのゲームが「あり」のときだけ送る
- **詳細の属性行に内容の行を足した。** `AttributeRow` に `notes` を足し、内容があるときだけ `flex-wrap` で行の下に出す。内容が無い行の HTML は従来と同じ
- **修正ツイート下書きの監視フィールド。** 存在しないキー（`hasRecording` / `hasStreaming`）を正しいキーに直し、無制限台に加えて店のサービスの4フィールドも足した。既存テストが `floor` を使っているため `floor` は残し、`floorByGame` を足した
- **開閉の操作はテストで確かめていない。** テスト環境に DOM が無い（`renderToStaticMarkup` のみ）ため、自動テストは初期が閉・要約・登録済み・並び順まで。押して開くことは本人が画面で確認する

> **位置づけ:** 実装前の計画。どのファイルを、どの順で、どのコミットで触るかを先に固定する。2026-11-18 に plan mode で手順を詰め、決まった点（下の「plan mode で決めたこと」）を反映した。設計で判断が変わったら、この文書を先に直す。

**Goal:** 無制限台（ゲーム別三値＋台数）、クレジットサービス・貸切（ゲーム別三値＋ゲーム別自由記述）を店舗情報に追加し、「無制限台あり」で絞り込めるようにする。先に店舗属性の定義を1か所に集約し、以後の属性追加を小さくする。

**Architecture:** `src/lib/store-attributes.ts` に属性レジストリ（データのキー・出どころのキー・ラベル・店単位/ゲーム別・種類・上限・付随先・表示枠・充実度グループ・報告可否・同値1行）を置き、報告入力型・API 検証・Issue 提案値表・オーバーライド適用・詳細表示・充実度をそこから導出する。付随フィールド（台数・内容）もレジストリの1項目として持ち、`parent` で本体を指す（出どころは本体のキーを共有）。`Store` / `OverrideEntry` のフィールド名、`overrides.json`、Issue 本文のラベル文字列は変えない。フォームの見た目は手で書く。

**関連:** ADR-0002（無制限台）、ADR-0003（店のサービス）、ADR-0004（折りたたみ）、ADR-0005（属性レジストリ）、Issue #31、#35、[画面モック](https://claude.ai/artifact/8bxiJxzwSEPmRtxZvertLy)（「サービスの内容: ゲームごと」が採用案）

## plan mode で決めたこと（2026-11-18）

- **同値1行の規則はフロアだけに残す。** ADR-0005 は「両ゲーム同値なら1行」を全属性へ広げるとしていたが、録画台・配信台の行が「録画台（ラスサバ）／録画台（イニブ）」から1行に変わり、既存 Issue 本文のラベル不変・フェーズAのスナップショット一致に反するため見送る。レジストリに `collapseSameValue` フラグを持たせ、フロアだけ立てる。ADR-0005 に追記する
- **旧形式のペイロードは受け付けない。** 平坦フィールド（`hasRecordingJojoLs` 等）は API で無視され、他に入力が無ければ 400。フォームと API は同時にデプロイされるので頻度は低い
- **ペイロードの形:** `StructuredStoreInput` は `machineCounts`（`OverrideEntry` と同じゲーム別マップ）と `attributes`（`Partial<Pick<OverrideEntry, 属性キー>>`）を持つ。台数は出どころが `countSources` で別管理のためレジストリに入れない
- **API 検証の規則は今のまま一般化する:** 文字列は trim して上限で切る（空は未入力）、三値の不正値は無視、数値の不正値（非整数・範囲外）は 400、リストの件数超過・要素の長さ超過は 400
- **「店のサービス」の枠は値が無くても出す**（モックどおり「未登録」行が2つ並ぶ）
- **絞り込みの並び:** 「無制限台あり」は「営業中のみ」の後ろ（モックどおり）。適用中チップ・要約も同じ順
- **既存バグの同時修正:** `scripts/override-tweet-draft.mjs` の監視フィールドが `hasRecording` / `hasStreaming` / `floor` のままで、実データのキー（`hasRecordingByGame` 等）と一致しておらず変化を拾えていない。新属性を足すついでに正しいキーへ直す

## Global Constraints

- 既存データ非破壊: `src/data/overrides.json` と `stores.json` は変更しない。既存の Issue 本文のラベル（「録画台（ラスサバ）」「ジョジョ台数」等）も変えない
- 挙動不変のリファクタ（フェーズA）は、Issue 本文のスナップショットと既存テスト（`src/__tests__` 59 ファイル＋`scripts/__tests__`）で確認してから次へ進む。フェーズAでテストを直すのは、入力型の変更に伴う `report.test.ts` / `report-route.test.ts` の入力の形だけ
- UI 文言は平易な日本語。用語の説明文（ヒント）は付けない。「クレサ」は「クレジットサービス」と書く（メモリ「UIはノンテック層前提」）
- 確定/未確認は `admin` のみ確定（`isConfirmedSource`）。自由記述（内容）は確定/未確認の対象外で中立表示
- フォームの見出しは既存どおりシステムフォント（`HEADING_FONT_STYLE` は使わない＝`layout.tsx` のサブセット追加は不要）
- パッケージ操作は pnpm のみ。push 前に `pnpm exec tsc --noEmit` と `pnpm test` と `pnpm lint`
- コミットはフェーズ内の論理単位で分け、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。PR タイトルは `ver2.6`、本文に `Closes #31` と `Closes #35`。push と PR 作成の前に本人に確認する
- dev / preview サーバーはこちらで起動しない（画面の確認は本人）

## ファイル計画

### フェーズA: 属性レジストリ導入（挙動を変えないリファクタ）

| 操作 | ファイル | 責務 |
|---|---|---|
| Test | `src/__tests__/report.test.ts` | **最初に**、現行の `buildStructuredStoreIssue` で全項目入り・両ゲーム同フロア・別フロア・片方だけの本文をインラインスナップショットで固定してコミット前に通しておく（置換後も同じ文字列であることの基準） |
| Create | `src/lib/store-attributes.ts` | 属性定義の正本 `STORE_ATTRIBUTES`（`as const`）。各項目は `key`（データのフィールド名）・`sourceKey`（`attributeSources` のキー）・`label`・`scope: 'store' \| 'game'`・`kind: 'ternary' \| 'text' \| 'number' \| 'list'`・上限（`maxLength` / `maxItems` / `itemMaxLength` / `min` / `max`）・`parent?`（付随先）・`panel?: 'facility' \| 'service'`・`completeness?`（グループ名）・`reportable`・`collapseSameValue?`・`filterable?`。既存の8項目（営業時間・フロア・ゲーム別フロア・喫煙所・決済・録画台・配信台・公式URL）を登録。走査用の小さな関数（`hasAttributeValue`、`reportableAttributes` 等）もここに置く |
| Create | `src/__tests__/store-attributes.test.ts` | レジストリのキーが `Store` と `OverrideEntry` の両方に存在すること（型レベル検査）、`sourceKey` が `StoreAttributeKey` に含まれること、ラベル重複なし、`parent` の指す先が存在しスコープが一致すること |
| Modify | `src/types/store.ts` | `StoreAttributeKey` をレジストリの `sourceKey` から導出（型のみの import）。`Store` インターフェース自体は明示のまま |
| Verify | `src/types/overrides.ts` | 変更なし。レジストリとの整合はテスト側で検査 |
| Modify | `src/lib/apply-overrides.ts` | `ATTRIBUTE_KEYS` と録画台・配信台・ゲーム別フロアの個別 if をレジストリ走査に置換（`store` → 代入、`game` → `mergeByGame`、出どころは `sourceKey` 単位） |
| Modify | `src/lib/report.ts` | `StructuredStoreInput` を `machineCounts` ＋ `attributes` の形へ。`buildStructuredStoreIssue` の行生成を「台数（手書き）→ レジストリ順の報告可能属性 → 修正・通報」に。ゲーム別は「ラベル（ラスサバ）」、`collapseSameValue` の項目だけ両ゲーム同値で1行 |
| Modify | `src/app/api/report/route.ts` | `validateStructuredStore` を種類と上限による汎用検証に置換。台数も同じ数値検証を使う。「全属性未入力なら拒否」は走査結果で判定 |
| Modify | `src/components/StoreInfoForm.tsx` | 送信ペイロードを新しい形で組む。見た目は変えない |
| Modify | `src/lib/info-display.ts` | `formatByGameTernary` に任意の `countByGame` を足す（「あり・4台」。フェーズBの下準備。この段階では呼び出し側は未使用）。レジストリ項目1つ分の表示値を返す `formatAttribute(store, def)` を足す（フロアは `formatFloorByGame`、ゲーム別三値は `formatByGameTernary`、他は種類ごと） |
| Modify | `src/components/StoreDetailPanel.tsx` | 設備一覧の行をレジストリの `panel: 'facility'` 項目の走査に。`AttributeRow` は維持し、出力 HTML は今と同じ |
| Modify | `src/lib/completeness.ts` | レジストリの `completeness` グループ単位で数え、台数だけ手書きで足す。項目数7・閾値は不変 |
| Test | `src/__tests__/report-route.test.ts` | 入力の形だけ新ペイロードへ直す。期待値は変えない。旧平坦フィールドだけの送信が 400 になるテストを足す |
| Test | `apply-overrides.test.ts`、`completeness.test.ts`、`store-detail-panel.test.tsx`、`store-info-form.test.tsx`、`info-display.test.ts` | 無修正で通ることを確認 |

**コミット分割:** (1) Issue 本文スナップショットの固定、レジストリと型・テスト (2) オーバーライド適用の置換 (3) 報告入力型・Issue 本文・API 検証・フォーム送信の置換 (4) 詳細表示・充実度の置換

### フェーズB: 無制限台（ADR-0002・Issue #31）

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/lib/store-attributes.ts` | `hasUnlimitedByGame`（ゲーム別三値、ラベル「無制限台」、`panel: 'facility'`、充実度は録画台・配信台と同じグループ、`filterable`）と付随 `unlimitedCountByGame`（ゲーム別数値 1〜99、ラベル「無制限台 台数」、`parent: 'hasUnlimitedByGame'`）。並びは配信台の後ろ |
| Modify | `src/types/store.ts`、`src/types/overrides.ts` | `hasUnlimitedByGame?`、`unlimitedCountByGame?` を JSDoc つきで追加（`StoreAttributeKey` は導出で自動） |
| Modify | `src/components/StoreInfoForm.tsx` | 録画台・配信台・無制限台を1つの「ゲーム別三値の2列」部品で描く。無制限台は配信台の下、「あり」のときだけ「台数（わかれば）」欄（`min=1 max=99`・placeholder「例）2」）。説明文なし。登録済みバッジ・初期値は既存値から |
| Modify | `src/lib/info-display.ts`、`src/components/StoreDetailPanel.tsx` | 「ラスサバ なし（未確認） ／ イニブ あり・4台（未確認）」の整形（`countByGame` を使う）。行はレジストリ順で配信台の下に自動で並ぶ |
| Modify | `src/types/store.ts`（`FacilityFilter`・`EMPTY_FACILITY_FILTER`）、`src/lib/facility-filter.ts`、`src/lib/filter.ts`、`src/lib/filter-storage.ts`、`src/lib/filter-summary.ts` | `hasUnlimited` 条件。選択中ゲームでスコープ（録画台と同じ `hasYesForGame`）。保存値のサニタイズ・適用中チップ・要約に追加 |
| Modify | `src/components/AddressFilterModal.tsx`、`src/components/area/AreaStoreFilter.tsx` | 「無制限台あり」のチェック／チップを「営業中のみ」の後ろ（エリアページは喫煙所の後ろ）に追加 |
| Modify | `src/lib/analytics.ts` | `apply_filter` に `has_unlimited` |
| Modify | `scripts/override-tweet-draft.mjs` | 監視フィールドを実データのキーへ直し（`floorByGame`・`hasRecordingByGame`・`hasStreamingByGame`）、`hasUnlimitedByGame`・`unlimitedCountByGame` を追加 |
| Test | `facility-filter.test.ts`、`filter-storage.test.ts`、`filter-summary.test.ts`、`store-filter-modal.test.tsx`、`report.test.ts`、`report-route.test.ts`、`apply-overrides.test.ts`、`store-detail-panel.test.tsx`、`info-display.test.ts`、`scripts/__tests__/override-tweet-draft.test.ts` | 無制限台の有無・台数・絞り込み・Issue 行（「無制限台（イニブ）」「無制限台 台数（イニブ）」の2行）・台数の範囲外で 400・詳細の「あり・4台」。詳細パネルの「未登録」件数テストは無制限台の分を埋めて意図を保つ |

**コミット分割:** (5) 無制限台のデータ・フォーム・表示 (6) 絞り込み「無制限台あり」（GA4・ツイート下書き含む）

### フェーズC: 店のサービス（ADR-0003・Issue #35）

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/lib/store-attributes.ts` | `creditServiceByGame` / `rentalByGame`（ゲーム別三値、ラベル「クレジットサービス」「貸切」、`panel: 'service'`、充実度に数えない、絞り込み不可）と付随 `creditServiceNoteByGame` / `rentalNoteByGame`（ゲーム別文字列・各100文字、ラベル「クレジットサービス 内容」「貸切 内容」） |
| Modify | `src/types/store.ts`、`src/types/overrides.ts` | 4フィールド追加 |
| Modify | `src/components/StoreInfoForm.tsx` | 「店のサービス」ブロック。2列に詰めず「ラスサバ、内容、イニブ、内容」の縦積み。「あり」のゲームだけ「内容」欄（placeholder「例）100円2クレ、平日のみ」「例）1時間3,000円、要予約」）。片方だけの店はそのゲームのみ（この段階ではまだたたまない） |
| Modify | `src/components/StoreDetailPanel.tsx` | 設備一覧の下に見出し「店のサービス」と別枠。`panel: 'service'` の行を走査し、行の下にゲーム名つきの内容を1行ずつ（片方だけの店はゲーム名なし） |
| Modify | `src/lib/info-display.ts` | ゲーム別自由記述の整形（`formatByGameNotes` → `{ game, label, text }[]`） |
| Test | `report.test.ts`、`report-route.test.ts`、`apply-overrides.test.ts`、`store-detail-panel.test.tsx`、`info-display.test.ts` | 三値と文章の往復、Issue 行（「クレジットサービス（イニブ）」「クレジットサービス 内容（イニブ）」）、内容の100文字切り詰め、片方だけの店でゲーム名を出さない |

**コミット分割:** (7) 店のサービスのデータ・フォーム・表示

### フェーズD: 提供フォームの折りたたみ（ADR-0004）

| 操作 | ファイル | 責務 |
|---|---|---|
| Create | `src/components/FoldSection.tsx` | 見出し（タイトル・登録済み・要約・開閉矢印）＋本文の折りたたみ部品。`aria-expanded` / `aria-controls`、閉じているときは本文に `hidden`。矢印と要約の見た目は `AddressFilterModal` の `renderAccordionHeader` にそろえ、枠はモックの角丸枠。初期は閉、開閉状態は保存しない |
| Modify | `src/components/StoreInfoForm.tsx` | 決済を無制限台の下へ移し `FoldSection` で包む（本文の先頭に「使えるものをすべて選んでください。」）。店のサービスも `FoldSection`。要約文は「未入力」「3件選択」「クレジットサービス あり（イニブ）」（全ゲームあり→「あり」、一部→「あり（ゲーム名）」、全部なし→「なし」、それ以外→「不明」、複数は「・」でつなぐ） |
| Test | 新規 `src/__tests__/fold-section.test.tsx`、`store-info-form.test.tsx` | 初期は閉（`aria-expanded="false"`・本文 `hidden`）・要約文・登録済み表示・決済が無制限台より後ろにあること。要約文は純関数に切り出して単体で検証 |

**コミット分割:** (8) 折りたたみ部品とフォームの並び替え

### フェーズE: 運用・文書

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `.github/workflows/reflect-user-reports.yml` | 指示文に新属性を追記。提案値表のラベルとフィールド名の対応は `src/lib/store-attributes.ts` を読むよう指示。内容（自由記述）は「SNS ID 等を除いた中立な1文に整え、ゲーム別の専用欄（`creditServiceNoteByGame` 等）へ。`remarks` には入れない」 |
| Modify | `docs/adr/0005-store-attribute-registry.md` | 「同値1行はフロアだけ」とした点を追記（マージ済み ADR の小さな補足。判断の置き換えではないため新 ADR は立てない） |
| Modify | `docs/plans/2026-10-10-store-service-attributes.md` | 実装後、計画と違った点を先頭に「実装後の変更」として追記 |
| Verify | `src/app/admin/overrides/OverridesAdmin.tsx` | 台数以外の属性は項目別 UI を持っていない。追加不要。JSON 直接編集で対応 |

**コミット分割:** (9) 自動反映ワークフローの指示文 (10) 文書の仕上げ（計画の「実装後の変更」・ADR の追記）

## 実行順と確認

1. フェーズA → `pnpm test` 全通過、`report.test.ts` のスナップショット一致（置換前に固定した文字列から差分ゼロ）、`pnpm exec tsc --noEmit`
2. フェーズB → フェーズC → フェーズD。各フェーズ末で `pnpm exec tsc --noEmit`、`pnpm test`、`pnpm lint`
3. フェーズE → `pnpm exec tsx scripts/validate-overrides.ts`（既存データが壊れていないこと）、`git diff main -- src/data/` が空であること
4. 本人に確認してから push と PR `ver2.6` の作成（本文に `Closes #31` `Closes #35`）。画面（詳細・フォーム・絞り込み）の目視は本人が dev サーバーで行う。マージ後に告知チェックリスト Issue が立つので、無制限台の絞り込みを告知の目玉にする
5. マージ後、自動反映ワークフローを手動 dispatch して新属性の反映を1件確認する（main に載るまで検証できない既知の制約）

## 未決事項

- 充実度の「台の設備」グループに無制限台を含めると、無制限台だけ報告された店も1項目分加算される。録画台・配信台と同じ扱いなので許容する想定
