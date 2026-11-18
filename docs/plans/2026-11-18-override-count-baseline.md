# 台数の上書きの基準値 実装計画

## 実装後の変更

- **基準値の CLI は並び順を変えない。** 計画では管理画面の API と同じく店舗ID順に並べ直す予定だったが、今の `overrides.json` は ID 順ではなく、並べ直すと全体が動く diff になった。`sync-count-baselines.ts` は並び順をそのままにして書き出す。整形は `JSON.stringify(…, 2)` のため、1行で書かれていた `payments` 配列だけは1要素1行に変わった（管理画面の保存と同じ形）
- **既存データの埋め込み結果。** 97店・121件に基準値を入れた。`updatedAt` は変わらず、修正ツイートの下書き（`detectChanges`）の対象も0件だった
- **管理画面の保存で、出どころの扱いを2点足した（計画外）。** フォームで既定の出どころ（`source`）を変えたとき、フォームに無い属性（営業時間・録画台など）は元の出どころを `attributeSources` に書き残す（台数の確認のついでに、未確認の営業時間が「確定」に変わるのを防ぐ）。台数の個別の出どころ（`countSources`）は、フォームで台数を保存し直すときに外す（これまでの画面と同じ挙動）
- **空のエントリの判定。** フォームの項目が空でも、営業時間などフォームに無い項目が残っていれば保存できるようにした（`hasOverrideContent`）
- **自動反映ワークフローの比較元。** 計画では `git show HEAD:…` を比較元にする予定だったが、Claude 自身も検証の前に基準値を入れる必要がある（入れないと `validate-overrides` が失敗し、Claude が手で書こうとする）。Claude は `git show` を使えないため、Claude の前に編集前のファイルを `$RUNNER_TEMP` に控え、Claude の手順3と Claude のあとの両方で `sync-count-baselines.ts --base` を回す形にした（何度回しても同じ結果）
- **確認の結果。** `stores.json` でファンタジスタのラスサバを 3台→2台 に書き換えて試し、一覧に1件出ること、地図の台数が公式の2台（出どころなし＝未確認）になり、イニブは上書きの8台のままであることを確かめてから元に戻した。`tsc`・`pnpm test`（790件）・`pnpm lint`（警告9件はいずれも既存のファイル）・`pnpm build` は通過。管理画面の確認はまだ（本人に依頼）

> **位置づけ:** 実装前の計画。どのファイルを、どの順で、どのコミットで触るかを先に決めておく。テストの細かい手順は実装中に詰める。なぜこの形にしたかは ADR-0009 に書いてあるので、ここでは繰り返さない。

**Goal:** 公式の台数が変わった店では、古くなった台数の上書きを地図に出さず、公式の値（未確認）を出す。使われなくなった上書きは週次の更新 PR で一覧にして知らせる。

**Architecture:** `OverrideEntry` に `countBaselines`（上書きした時点の公式台数・ゲーム別。公式に台数が無いときは 0）を足す。基準値の扱いは新しく作る `src/lib/count-baseline.ts` にまとめ、書き込む側（管理画面の API・自動反映ワークフロー・CLI）と読む側（`applyOverrides`・週次の一覧）の両方がそれを使う。基準値は人にも Claude にも手で書かせず、必ずスクリプトか API が `stores.json` から入れる。

**関連:** [ADR-0009](../adr/0009-override-count-baseline.md)、ADR-0008（取れなかったサイトの台数は前回値を引き継ぐ）

## Global Constraints

- 今のブランチ `fix/pair-schedule-freshness-threshold` にある未コミットの `.github/workflows/data-freshness.yml` には触れない。ADR-0009 をコミット済みのブランチ `docs/adr-override-count-baseline`（origin/main から切ったもの）を `git worktree add` で開き、そこで作業する（この計画文書もそこでコミットする）
- 地図の画面には新しい表示を足さない。変わるのは、古くなった上書きのある店の台数が公式の値（未確認の見た目）に戻ることだけ。管理画面には「要確認」の表示を足す
- 基準値だけを埋める変更では、`updatedAt` を変えない（公開の「情報更新日」が一斉に変わるのを防ぐ）
- パッケージ操作は pnpm だけを使う。push 前に `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint` を通す
- dev / preview サーバーは起動しない。管理画面の確認は本人に頼む（`pnpm build` は確認のために回してよい）
- コミットの末尾は `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。PR タイトルはパッチの `N.N.N`（番号は PR 作成時に main の最新を見て決める）

## ファイル計画

### フェーズ1: 管理画面で保存すると項目が消えるのを直す（既存のバグ）

今は、管理画面から保存すると `overrides.json` 全体で営業時間（90件）・補足（43件）・録画台（124件）・配信台（129件）・フロアなどが消える。原因は2つあり、どちらも直す。API の `validateEntry` が台数・閉店・店名・座標以外を落とすことと、画面がエントリをフォームの項目だけで作り直すこと。基準値も同じ経路で消えるので、フェーズ2の前に直す。

| 操作 | ファイル | 責務 |
|---|---|---|
| Create | `src/lib/override-entry.ts` | `sanitizeOverrideEntry(raw)`：`source` を必須にし、知っている項目は型が合わなければ落とし、知らない項目はそのまま残す。`mergeFormEntry(existing, formEntry)`：フォームで扱う項目（台数・出どころ・メモ・補足・閉店・移設・店名・住所・座標）だけを差し替え、それ以外は既存エントリのまま残す |
| Modify | `src/app/api/overrides/route.ts` | `validateEntry` を `sanitizeOverrideEntry` に置き換える（読み込みと保存の両方） |
| Modify | `src/app/admin/overrides/OverridesAdmin.tsx` | `save()` の `{ note: selected.name, ...entry }` を `mergeFormEntry(current.overrides[id], …)` に置き換える |
| Test | `src/__tests__/override-entry.test.ts` | 営業時間・録画台・`attributeSources` などが保存の前後で残ること、フォームで消した台数・補足は消えること、型の合わない値は落ちること |

**コミット分割**
1. `fix(admin): 管理画面で保存しても営業時間や補足が消えないようにする`

### フェーズ2: 基準値を持たせて、必ず書き込まれるようにする

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/types/overrides.ts` | `countBaselines?: Partial<Record<GameTitle, number>>` を足す。説明コメントで「上書きした時点の公式台数・0は公式に台数なし・手で書かない」と明記 |
| Create | `src/lib/count-baseline.ts` | `officialCount(store, game)`（無ければ 0）、`isCountOverrideStale(official, baseline)`（基準値が無いときは false）、`syncCountBaselines(file, stores, { base?, confirmIds? })`（台数を持つゲームごとに、基準値が無い・`base` から台数が変わった・`confirmIds` に入っている、のどれかなら今の公式値を入れる。台数を消したゲームの基準値は消す。`updatedAt` は触らない）、`listStaleCountOverrides(stores, file)`（店名・ゲーム・基準値・今の公式値・上書き値の一覧） |
| Create | `scripts/sync-count-baselines.ts` | CLI。`src/data/stores.json`（上書き前の公式データ）を読んで `overrides.json` に基準値を書く。`--base <file>` で比較元を指定し、`--confirm <id,…>` で指定した店の基準値を今の公式値に更新する。書き出しの整形は API と同じ（ID 昇順・2スペース・末尾改行） |
| Modify | `src/app/api/overrides/route.ts` | 保存時に、ディスク上の現行ファイルを `base` にして `syncCountBaselines` を通す。リクエスト本文の `confirmIds` も渡す。上書き前の公式データとして `stores.json` を直接読む（`@/data/stores` は上書き適用済みなので使わない） |
| Modify | `src/app/admin/overrides/OverridesAdmin.tsx` | 選んだ店の上書きが古くなっていたら「公式の台数が 5台→2台 に変わったため、この上書きは今使われていません」と出し、「この台数で確認した」のチェックで `confirmIds` に入れて保存する。上書き一覧にも「要確認」を出す |
| Modify | `.github/workflows/reflect-user-reports.yml` | Claude の編集のあと・検証の前に、`git show HEAD:src/data/overrides.json` を比較元にして `sync-count-baselines.ts --base` を回す。指示文の禁止事項に「`countBaselines` は書かない（スクリプトが入れる）」を足す |
| Modify | `scripts/validate-overrides.ts` | 台数の上書きがあるのに基準値が無いゲームがあれば失敗にする（書き込み経路の入れ忘れを止める）。古くなった上書きは失敗にせず件数だけ出す |
| Test | `src/__tests__/count-baseline.test.ts` | 基準値の補完（無いとき・台数を変えたとき・確認したとき・台数を消したとき）、変えていない台数の基準値は動かないこと、`updatedAt` が変わらないこと、公式に台数が無いと 0 になること |
| Verify | `src/data/overrides.json` | `pnpm exec tsx scripts/sync-count-baselines.ts` で既存の 121 件（97店）を埋め、差分が `countBaselines` の追加だけであることを確かめる |
| Verify | `scripts/override-tweet-draft.mjs` | 基準値だけの変更で修正ツイートの下書きが出ないこと（`detectChanges` は項目を名指しで比べているので出ない見込み。埋める前後のファイルで実際に回して確かめる） |

**コミット分割**
2. `feat(overrides): 台数の上書きに公式台数の基準値を持たせる`（型・lib・スクリプト・API・管理画面・自動反映・検証・テスト）
3. `chore(overrides): 既存の台数上書きに基準値を埋める`（`overrides.json` のみ）

### フェーズ3: 公式が変わった上書きを使わず、週次更新で知らせる

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/lib/apply-overrides.ts` | `applyEntry` の台数ループで、`isCountOverrideStale(officialCount(store, game), entry.countBaselines?.[game])` なら、そのゲームの台数と `countSources` を上書きしない。他のゲームと台数以外の項目は今までどおり適用する |
| Test | `src/__tests__/apply-overrides.test.ts` | 基準値と同じ→上書きを使う、5→2→公式の2（出どころは上書きしない）、5→台数なし→台数なし、基準値なし→上書きを使う（移行前データ向け）、片方のゲームだけ古いとき、台数以外の項目は使われること |
| Create | `scripts/report-stale-count-overrides.ts` | 新しい `stores.json` と `overrides.json` から `listStaleCountOverrides` を作り、Markdown の一覧を標準出力と `GITHUB_OUTPUT`（`stale_count_overrides`・`stale_count`）に書く |
| Modify | `.github/workflows/update-stores.yml` | パイプラインのあとに上のスクリプトを回し、1件以上あれば PR 本文に「公式の台数が変わったため使われなくなる上書き（N件）」の節を足す。見直し方（管理画面で「この台数で確認した」、または `--confirm`）も1行書く |
| Test | `scripts/__tests__/report-stale-count-overrides.test.ts` | 0件のとき何も出さないこと、一覧の行の形 |

**コミット分割**
4. `feat(overrides): 公式の台数が変わった上書きは使わず、週次更新で知らせる`

## 実行順と確認

1. `git worktree add <作業用パス> docs/adr-override-count-baseline` で作業場所を作り、この計画を `docs/plans/2026-11-18-override-count-baseline.md` に保存して `docs(plan): override-count-baseline の実装計画` でコミットする
2. フェーズ1 → `pnpm test src/__tests__/override-entry.test.ts`・`pnpm exec tsc --noEmit`
3. フェーズ2 → `pnpm test`・`pnpm exec tsc --noEmit`・`pnpm exec tsx scripts/sync-count-baselines.ts`・`pnpm exec tsx scripts/validate-overrides.ts`・`git diff --stat src/data/overrides.json`（`countBaselines` だけ増えていること）
4. フェーズ3 → `pnpm test`。手元の確認として、作業用コピーの `stores.json` で1店の台数を書き換え、`report-stale-count-overrides.ts` の出力と、`applyOverrides` を通した台数が公式の値になることを確かめてから元に戻す
5. 最後に `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint`・`pnpm build`
6. 管理画面の確認は本人に頼む（dev サーバーを立てて、営業時間のある店を保存しても他の項目が消えないこと、古い上書きに「要確認」が出ること）
7. PR タイトルは `N.N.N`。本文に「既存の 121 件に基準値を埋めた」「管理画面の保存で項目が消えるバグも直した」を書く
8. マージ後、次の週次更新 PR の本文に一覧の節が出るか（0件なら出ないこと）を見る

## 未決事項

- 公式の数え方が全体で変わって、一度に大量に外れたときの扱い。ADR-0009 の見直しの目安（週10件超）を超えたら、そのときに判断する。今回は件数を PR 本文に出すだけにする
- 古くなった上書きを地図上の見た目で区別するか。今回は区別しない（公式の値の未確認表示に戻るだけ）。必要になったら別に検討する
