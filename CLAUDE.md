# 開発の進め方

小さな Next.js アプリ（ラスサバ／イニブ設置店マップ）。開発は本人1名と Claude Code。
重い承認フローは置かず、**判断は ADR、作業は plan mode、記録は計画文書** の3点で回す。

## Project Context

### Paths
- Steering（プロジェクト知識）: `.kiro/steering/`（`product.md` / `tech.md` / `structure.md`。`/kiro:steering` で更新）
- 設計判断（ADR）: `docs/adr/`
- 実装計画: `docs/plans/`
- 過去のスペック: `.kiro/specs/`（ver2.5 までの履歴。新規には作らない）

### Steering
- `.kiro/steering/` 全体をプロジェクトメモリとして読み込む
- 構成や技術の前提が変わったら `/kiro:steering` で更新する

## Development Guidelines
- Think in English, generate responses in Japanese. プロジェクト内に書く Markdown（ADR・計画・docs）は日本語

## Workflow
1. **相談・判断**: データの持ち方・層の分け方・運用ルール・代替案を捨てた UX 方針が決まったら、実装前に `docs/adr/` に ADR を書く（`/lsib-adr`）。判断待ちは `Proposed` で置く
2. **計画**: 実装に入る前に `/lsib-plan`。plan mode に入って進め方を詰め、承認された計画を `docs/plans/YYYY-MM-DD-<feature>.md` に保存してコミットする。触るファイル・順序・コミット分割・確認手順を含める
3. **実装**: 計画の順に進める。コミットは論理単位で分ける（微修正を1件ずつにしない。PR 前に2〜4件へまとめる）。push 前に `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint`
4. **振り返り**: 計画と違う結果になったら計画文書の先頭に「実装後の変更」を足す。判断が変わったら ADR を改訂（未マージ）または新 ADR で置き換え（マージ後）

kiro のスペック駆動（要件→設計→タスクの3段階承認）は **使わない**。レビュー工数が大きすぎたため plan mode に置き換えた（ADR-0006）。`.claude/commands/kiro/spec-*` は残っているが呼ばない。

## Development Rules
- ADR と計画の書き方はプロジェクトスキル `/lsib-adr` `/lsib-plan`（`.claude/skills/`）に従う
- ADR は「なぜ」、計画は「どこを・どの順で・どう作るか」。同じことを両方に書かない
- PR タイトルは `verN.N`（機能リリース・告知あり）または `N.N.N`（パッチ）。詳細は `.github/workflows/pr-title-lint.yml`
- パッケージ操作は pnpm のみ。dev / preview サーバーは本人が起動する
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.
