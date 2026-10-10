---
name: lsib-plan
description: Use when the user runs /lsib-plan, asks for a plan or 「planにして」, asks which files an implementation will touch, or when a non-trivial implementation in this repo is about to start and no plan exists yet under docs/plans/.
---

# lsib-plan: plan mode で計画し、承認後に文書として残す

## Overview

Claude Code の plan mode をそのまま使い、**承認された計画を `docs/plans/YYYY-MM-DD-<feature>.md` に保存する**ところまでを1つの流れにする。plan mode の計画ファイルに書く内容を最初から文書の体裁で書けば、承認後は写してコミットするだけで済む。ADR（なぜ）と計画（どこを・どの順で・どう作るか）は別の文書。kiro スペックは使わない（ADR-0006）。

## When to Use

- `/lsib-plan` が呼ばれた
- 「どんなファイルをいじるのか」「planにして」と言われた
- 3ファイル以上を触る実装、既存機能の複製で属性・項目を足す実装に入る前

使わない: 1〜2ファイルで終わる修正、データだけの修正（overrides.json の反映など）。それらは plan mode も計画文書も不要。

## 流れ

```
EnterPlanMode → 調査（grep で触る場所を実測）→ 計画ファイルに文書の体裁で書く
→ ExitPlanMode（承認）→ docs/plans/ に保存 → docs(plan) でコミット → 実装へ
```

1. **plan mode に入る。** `EnterPlanMode` を呼ぶ（未ロードなら ToolSearch で `select:EnterPlanMode,ExitPlanMode`）。利用者の承認で plan mode が始まる
2. **触る場所を実測する。** 似た既存項目名で grep し、ファイル一覧を出す。直感で列挙しない

   ```bash
   grep -rl "hasRecordingByGame\|hasRecordingJojoLs" src scripts .github docs | sort
   ```

3. **判断が絡むなら先に ADR の要否を見る。** データの持ち方・層の分け方・運用ルールが未決なら、計画の「未決事項」に書くか、`AskUserQuestion` で決めてもらい、承認後に `/lsib-adr` で残す
4. **plan mode の計画ファイルに、下の「文書の体裁」でそのまま書く。** 要約や箇条書きだけで済ませない。ここで書いたものが保存される本文になる
5. **`ExitPlanMode` で承認を求める。** 差し戻しがあれば計画ファイルを直して再度
6. **承認されたら保存する。** 計画ファイルの内容を `docs/plans/YYYY-MM-DD-<feature>.md` に書き出す（日付は当日、feature は英語ケバブ）。既存の計画と体裁をそろえる
7. **単独でコミットする。** `docs(plan): <feature> の実装計画`。実装のコミットと混ぜない
8. **実装後、計画と違う結果になったら** 先頭に「実装後の変更」節を足す（例: `2026-09-17-about-lp-redesign.md`）

## 文書の体裁

先頭から順に:

- `# <機能名> 実装計画`
- `> **位置づけ:**` 1〜2文（何のための計画か。手順レベルは実装中に詰める、など）
- `**Goal:**` 1文
- `**Architecture:**` 2〜3文（どう作るか。インターフェースや型の要点）
- `**関連:**` ADR 番号・Issue・モック
- `## Global Constraints` メモリと CLAUDE.md の制約を具体値で（pnpm のみ、tsc/test/lint、文言ルール、PR タイトル、サーバーは起動しない 等）
- `## ファイル計画` フェーズごとの表。列は「操作（Create / Modify / Test / Verify）」「ファイル」「責務」。1ファイル1行、責務は1〜2文。フェーズ末に **コミット分割** を番号で
- `## 実行順と確認` 各フェーズ末に回すコマンド、PR タイトル、マージ後の確認
- `## 未決事項` 実装中に決めること

## 文書の分担

| 文書 | 答える問い | 粒度 |
|---|---|---|
| `docs/adr/NNNN-*.md` | なぜこの形にしたか | 判断 |
| `docs/plans/*.md` | どう作るか・どのファイルを・どの順で・どのコミットで | 構造とファイル |
| plan mode の会話 | 手順の詰め、迷う点の相談 | 承認後に計画文書へ写す |

## Common Mistakes

- plan mode の計画ファイルに要約だけ書き、承認後に文書を書き直す → 二度手間。最初から文書の体裁で書く
- 承認後に保存を忘れて実装に入る → セッションをまたぐと計画が消える。保存とコミットを実装の前に
- grep せずに記憶でファイルを列挙する → 絞り込みの保存・要約・GA4 のような脇の層を落とす
- 挙動を変えないリファクタと機能追加を同じフェーズに混ぜる → スナップショットで前後比較できなくなる
- 「確認が必要」を書いたまま確認しない → plan mode の調査中に決着させ、Verify 行として結果を書く
- 計画に「なぜ」を長く書く → ADR に書き、計画からは番号で参照する
