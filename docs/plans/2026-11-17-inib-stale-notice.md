# イニブ店舗情報の注意ページ 実装計画

> **位置づけ:** Issue #514（イニブ公式が GitHub Actions に 403 を返し、週次の店舗データ更新が止まっている）への利用者向けの断り。データ更新の修正（`fix/scrape-per-site-partial`）とは別ブランチ `fix/inib-stale-notice`（ワークツリー `../ls-exvs-map-wt-inib-notice`、origin/main 起点）で進める。

**Goal:** サイトを開いたときの「お知らせ」（オンボーディングモーダル）の1ページ目に、イニブの店舗情報が最新でない可能性があることを伝える注意ページを出す。既に新機能を読んだ再訪ユーザーにも一度は自動で出す。

**Architecture:** `Onboarding.tsx` に一時的な注意の定数 `NOTICE: { id; ... } | null` を置き、非 null のとき `PAGES` の先頭に `NoticePage` を足す。既読は新しいキー `ls-exvs-notice-seen` に `NOTICE.id` を保存し、既存の `ls-exvs-onboarded` / `ls-exvs-news-seen` とは独立に判定する。自動オープンの判定は純関数 `decideAutoOpen()` に切り出してテストする。解消したら `NOTICE = null` にするだけでページも自動表示も消える。

**関連:** Issue #514、`fix/scrape-per-site-partial`（PR 2.5.9 予定）

## Global Constraints

- 文言は平易な日本語で短く。アイコンは使わない。用語の説明文は付けない（メモリ「UIはノンテック層前提」）
- 見出しに `HEADING_FONT_STYLE` を使う。見出し「イニブの店舗情報について」の文字は `src/app/layout.tsx` の `&text=` サブセットに既に全部含まれているため、layout.tsx は変更しない（実測済み）
- 既存の既読キーの意味は変えない。初回ユーザーは従来どおり page 0 から（その page 0 が注意ページになる）
- パッケージ操作は pnpm のみ。コミット前に `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint`
- dev / preview サーバーは起動しない。push と PR 作成は本人に確認してから
- 元のチェックアウト（`fix/pair-schedule-freshness-threshold`、未コミット変更あり）には触らない

## ファイル計画

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/components/Onboarding.tsx` | `NOTICE` 定数・`NOTICE_SEEN_KEY`・`NoticePage` を追加し、`PAGES` の先頭へ条件付きで挿入。`decideAutoOpen({ onboarded, newsSeen, noticeSeen })` を export（優先順: 初回 → page 0 / 注意が未読 → page 0・source `auto_notice` / 新機能が未読 → 新機能ページ / それ以外 → 開かない）。`handleClose` で `NOTICE_SEEN_KEY` も保存 |
| Modify | `src/lib/analytics.ts` | `open_help.source` に `'auto_notice'` を追加 |
| Test | `src/__tests__/onboarding-modal.test.tsx` | 1ページ目に注意ページの見出しが出ること、ページ数 6 への更新、`decideAutoOpen` の4パターン（初回／注意未読の再訪＝新機能既読でも開く／注意既読・新機能未読／両方既読） |

注意ページの文言（案）:

- ラベル: 「お知らせ」（淡いアンバーの小さなピル。アイコンなし）
- 見出し: 「イニブの店舗情報について」
- 本文:
  1. 10月下旬から、イニブ公式サイトの店舗ページを読み込めない状態が続いています。
  2. そのため、このサイトのイニブの店舗情報（設置店や台数など）は、最新ではない可能性があります。お出かけ前に、公式サイトやお店の情報もあわせてご確認ください。
  3. ラスサバの店舗情報は、これまでどおり更新しています。

**コミット分割:**
1. `docs(plan): イニブ店舗情報の注意ページの実装計画`
2. `feat: お知らせの1ページ目にイニブ店舗情報の注意を追加`（上記3ファイル）

## 実行順と確認

1. 計画を `docs/plans/2026-11-17-inib-stale-notice.md` に保存してコミット
2. テストを先に書いて落ちることを確認 → 実装
3. `pnpm install --frozen-lockfile`（ワークツリーに node_modules が無いため）→ `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint`
4. コミット。push / PR は本人確認後。PR タイトルは `N.N.N`（パッチ）
5. マージ後: 本番で新機能既読のブラウザを開き、注意ページから自動で開くこと、閉じて再読込すると出ないことを確認（本人）

## 未決事項

- PR タイトルの番号（2.5.9 が #514 修正で使われる予定のため 2.5.10 を想定。2つを1つの PR にまとめるなら 2.5.9）
- イニブ側の取得が復旧したら `NOTICE = null` に戻す（別 PR）
