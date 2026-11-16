# 店舗データ取得のサイト別部分更新 実装計画

> **位置づけ:** Issue #514（設置店舗データ自動更新の連続失敗）の対処。片方の公式サイトが取れない週でも、取れたサイトの分だけ stores.json を更新できるようにする。手順レベルは実装中に詰める。

## 実装後の変更

- **件数の検証は area 単位のまま。** 計画ではフェッチ成否も件数検証も site×area 単位にするとしていた。しかし件数をサイト別に見ると、イニブの最後の1店が消えた県（前回1件→今回0件）が「不確定」のままになり、いつまでも移設判定できない。そこでフェッチ成否だけを site×area 単位にし、件数はその area で取れたサイトの分を合算して、同じサイトの前回件数の合算と比べる形にした。両サイト取れた週は従来と同じ判定になる（ADR-0008 も同日中に改訂）
- サイト単位の全体異常（急減）判定は、area 検証より前に「取得できた site×area の件数の合計」で行う。イニブが一覧構造の変化で全県0件になっても、ラスサバ側の area 検証を巻き込まないため

**Goal:** イニブ公式（gundam-vs.jp）が GitHub Actions から HTTP 403 を返す状態でも、ラスサバ公式の分だけで週次更新を成功させ、取れなかったサイトは Issue で知らせる。

**Architecture:** 取得の成否と件数の検証を「地域単位」から「サイト×地域単位」に変える。`ScrapeResult.scrapedAreas` を `Map<SiteKey, Set<string>>` にし、マージでは「そのゲームのサイトを正常に取れた地域」でだけ、そのゲームの掲載消失を判定する（取れなかったサイトのゲーム・台数は前回値を引き継ぐ）。全国の急減ガードはサイトごとに判定し、急減したサイトは丸ごと除外して `skippedSites` で返す。全サイトが除外されたときだけ従来どおり中断する。

**関連:** Issue #514、[ADR-0008](../adr/0008-partial-update-per-official-site.md)

### 原因の確認結果（調査済み）

- 10/28・11/04・11/11 の3回とも、`gundam-vs.jp` の全96リクエスト中 gundam 分48件が **HTTP 403**。jojols 分は全件取得できていた
- 手元からは同じ URL・同じ User-Agent で **200**。サイトは落ちておらず、GitHub Actions のランナー IP が弾かれていると見られる
- 現行は地域内でどちらかのサイトが失敗すると地域ごと除外するため、47地域すべてが除外 → 全国 0 件 → 急減ガードで中断していた

## Global Constraints

- 既存データ非破壊: 取れなかったサイトの店舗・ゲーム・台数・`delisted` は前回値のまま。両サイト取れた週の結果は現行と同じになること
- パッケージ操作は pnpm のみ。push 前に `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint`
- 作業は `git worktree` で `origin/main` から `fix/scrape-per-site-partial` を切って行う（今のブランチ `fix/pair-schedule-freshness-threshold` の未コミット変更 `data-freshness.yml` には触れない）
- コミット末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。PR タイトルは `2.5.9`（パッチ）
- dev / preview サーバーは起動しない（今回は UI 変更なし）

## ファイル計画

### フェーズ0: 判断と計画の記録

| 操作 | ファイル | 責務 |
|---|---|---|
| Create | `docs/adr/0008-partial-update-per-official-site.md` | サイト×地域単位で成否を判定し、片方のサイトだけでも更新する判断。却下案（IP ブロック回避のプロキシ／自前ランナー、現状維持で手動実行）を残す |
| Create | `docs/plans/2026-11-17-per-site-partial-scrape.md` | 本計画の保存 |

**コミット分割:** 1. `docs(adr): 公式サイト別の部分更新を ADR-0008 に記録` 2. `docs(plan): per-site-partial-scrape の実装計画`

### フェーズ1: サイト×地域単位の成否判定

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `scripts/types.ts` | `ScrapeResult.scrapedAreas` を `Map<SiteKey, Set<string>>` に。`skippedSites: SiteKey[]` を追加 |
| Modify | `scripts/scrape.ts` | 集計キーを `site:area` に（東京の sw 分割は両方成功で成立）。`ScrapeDeps.prevAreaCounts` を `Map<SiteKey, Map<area, n>>`、`prevTotal` を `prevTotals: Map<SiteKey, n>` に。`isAreaReliable` は「0件でも前回も0件なら信頼」を追加（基準なしの0件は従来どおり不確定）。急減ガードはサイトごと: 急減したサイトは除外して `skippedSites` へ、全サイト除外なら `ScrapeAbortError`。完了ログをサイト別に |
| Modify | `scripts/merge.ts` | `SITE_TO_GAME` を export。`MergeInput.scrapedAreas` を新しい型に。(a) 今回掲載あり・前回一致の店舗は、未取得サイトのゲームと台数を前回から引き継ぐ (b) 今回掲載なしの前回店舗は、取得できたサイトのゲームだけ外し、残りが空なら従来どおり `delisted`、残れば非 delisted で残す |
| Modify | `scripts/pipeline.ts` | `computePrevBaseline` をサイト別（`games` → サイト）に。ログの成功エリア数をサイト別に。CLI 実行時、`GITHUB_OUTPUT` があれば `skipped_sites`（「イニブ」等の表示名、カンマ区切り）を書く |
| Test | `scripts/__tests__/scrape.test.ts` | gundam 全失敗でも jojols 分が返り `skippedSites=['gundam']`／片サイトの1地域失敗はその site×area だけ除外／全サイト急減で中断／前回0件の0件は信頼 |
| Test | `scripts/__tests__/merge.test.ts` | 既存テストは「両サイト取得済み」ヘルパで新しい型に置換。追加: 両対応店で gundam 未取得→ゲーム・台数維持／jojols から消えた両対応店で gundam 未取得→gundam だけで残る／jojo 単独店が消えた→delisted |
| Test | `scripts/__tests__/pipeline.test.ts` | `computePrevBaseline` のサイト別件数、gundam 403 想定の結合テスト（jojols 分で生成され gundam 店舗は前回のまま） |

**コミット分割:** 3. `fix(scrape): 公式サイトごとに取得成否を判定し片方だけでも更新する`

### フェーズ2: スキップの通知

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `.github/actions/report-failure/action.yml` | 任意入力 `title`・`message` を追加（未指定なら現行の「🔴 ワークフロー失敗」と文面のまま） |
| Modify | `.github/workflows/update-stores.yml` | パイプライン段に `id: pipeline`。`skipped_sites` が空でなければ PR 本文に1行足し、`report-failure` を `title: 🟡 一部サイトを取得できず: 設置店舗データ自動更新` で呼ぶ（同タイトルの open Issue へコメント集約） |
| Test | `scripts/__tests__/workflow.test.ts` | `skipped_sites` を見て通知する段があること |

**コミット分割:** 4. `ci(update-stores): 取得できなかったサイトを Issue で知らせる`

## 実行順と確認

1. フェーズ0 → 1 → 2 の順。各フェーズ末に `pnpm exec tsc --noEmit && pnpm test && pnpm lint`
2. フェーズ1の後、手元で `scrapeStores` を `sites: ['jojols']` 相当で回す代わりに、上記の結合テストで gundam 403 を再現して確認（手元は gundam も 200 で取れるため実フェッチでは再現できない）
3. push → PR `2.5.9`（base: main）。本文に原因の調査結果と「#514 は自動ではクローズしない」旨
4. マージ後に `gh workflow run update-stores.yml --ref main` で再実行し、ログで jojols 分の取得・gundam のスキップ・🟡 Issue 作成・更新 PR 作成を確認。成功したら #514 をクローズしてよいか本人に確認

## 未決事項

- gundam 403 の根本対応（プロキシ経由、自前ランナー、取得元の変更など）は本 PR の範囲外。🟡 Issue が続くようなら別タスクで検討
