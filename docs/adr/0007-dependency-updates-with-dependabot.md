# ADR-0007: 依存パッケージの更新は Dependabot に任せる

- 日付: 2026-10-16
- ステータス: Accepted
- 関連: [Next.js Security Update (2026-10-14)](https://nextjs.org/blog/nextjs-security-update-october-14-2026)、`.github/dependabot.yml`、`.github/workflows/pr-title-lint.yml`

## 背景

- 2026-10-14 に Next.js の緊急セキュリティ更新が出た（Critical 2件・High 1件）。このうち画像最適化 API の RCE（CVE-2026-96889、`sharp` 経由・glibc の Linux が対象）は、`next/image` を使っていて Vercel（Linux）で動くこのアプリにも当てはまる。
- 気づいた時点で入っていたのは `next` 16.2.7。修正版は 16.4.1 で、マイナー版2つ分遅れていた。依存の更新は手動で `pnpm outdated` を見るしかなく、定期的に見る仕組みがなかった。
- GitHub の Dependabot alerts と security updates はどちらも無効だった（secret scanning は有効）。
- 開発は本人1名なので、更新 PR が多すぎるとレビューしきれずに放置される。

## 決定

Dependabot を使い、次のように動かす。

- 対象は `npm`（pnpm の lockfile も読まれる）と `github-actions`
- バージョン更新は **週1回**。minor と patch は **1本の PR にまとめる**。major は1件ずつ PR にして、個別に判断する
- セキュリティ更新は、リポジトリ設定の Dependabot security updates で **見つかりしだい個別に** PR にする
- Dependabot の PR（head が `dependabot/` で始まるブランチ）は **PR タイトル lint の対象外** にする

理由:

- 今回のような脆弱性の修正版が、気づくのを待たずに PR として届く
- minor/patch をまとめれば、週に届く PR は数本で済み、1人でもさばける
- Dependabot のタイトル（`chore(deps): bump …`）は `verN.N` / `N.N.N` にできない。リリース名を付けるのは本人が main 向けにまとめる PR なので、依存更新 PR は告知ドラフト（`*-release`）と同じ扱いで外す

## 検討した選択肢

### 案B: Renovate

- 概要: GitHub App として入れ、`renovate.json` で細かく設定する
- 利点: グループ化・自動マージ・スケジュールの自由度が高い。pnpm workspace の扱いもこなれている
- 欠点 / リスク: 外部 App のインストールが要る。設定項目が多く、1人で保守するには重い
- 却下理由: いま欲しいのは「週次でまとめて届く」「脆弱性は即届く」の2つだけで、Dependabot の標準機能で足りる

### 案C: これまでどおり手動で更新する

- 概要: 気づいたときに `pnpm outdated` を見て上げる
- 利点: 仕組みが増えない。PR も増えない
- 欠点 / リスク: 今回のように、脆弱性の告知を見るまで遅れに気づかない
- 却下理由: 今回それで修正版から2マイナー遅れたため

## 影響

- 楽になる: 依存の遅れと脆弱性に、告知を追わなくても PR で気づける
- 難しくなる: 毎週 PR が届く。CI（tsc・test）が通るかを見てマージする手間が増える。PR タイトル lint に例外が1つ増える
- 見直しの目安: 週の PR が多すぎて放置が続く、または自動マージが欲しくなったら、グループの切り方の変更か Renovate への移行を考える
