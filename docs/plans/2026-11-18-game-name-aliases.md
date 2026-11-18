# タイトル名の表記揺れ補強 実装計画

> **位置づけ:** 実装前の計画。どのファイルを、どの順で、どのコミットで触るかを先に決めておく。テストの細かい手順は実装中に詰める。

**Goal:** 「エクバ2」「EXVS2IB」などの別名を、検索エンジンが「隠しテキスト」と見なさない場所にだけ出す。あわせて、あちこちに直書きされているタイトル名を `GAME_NAMES` 1か所から作るようにする。

**Architecture:** `src/lib/site-config.ts` の `GAME_NAMES` を名称の正本にして、別名は検索されやすい順に並べる。トップページの description・keywords・構造化データは新しく作る `src/lib/site-seo.ts` で組み立て、`layout.tsx`・`SeoContent.tsx`・`manifest.ts` はそこから読む。別名は、メタ description（トップ・エリア）と、別名がすでに画面に出ている `/about` の構造化データ（`AboutPage.about` に `VideoGame` と `alternateName`）にだけ入れる。

**関連:** 会話での SEO 調査（2026-11-18）。ADR はなし（下の「別名の置き場所」の方針は `site-config.ts` のコメントに書く）

## 別名の置き場所（クローラーからの信頼との関係）

| 置き場所 | 扱い | 理由 |
|---|---|---|
| メタ description（トップ・`/area`・県ページ） | 入れる | 検索結果の説明文として使われる標準の場所。隠しテキストには当たらない。別名は自然な形で1〜2個にとどめ、羅列しない |
| `/about` の構造化データ | 入れる | 「別名・表記：」が画面に出ているので、構造化データは画面の内容と一致する（Google のガイドラインどおり） |
| トップの読み上げ用本文（`sr-only` の `SeoContent`） | 入れない | 画面に見えない文章に検索語を足すのは、ガイドラインがスパム扱いする典型。既存のコメントにある「隠しテキストで本文を水増ししない」方針も守る |
| トップの構造化データ（`WebApplication`） | 別名は入れない | トップの画面には別名が出ていないため、入れると「画面に無い内容のマークアップ」になる |
| `keywords` メタ | `GAME_NAMES` から作る | Google は順位付けに使わない。害も効果もないので、一貫性のためだけに揃える |
| 画面の文言（エリアページの導入文など） | 変えない | メモリ「UIはノンテック層前提」（用語の説明を足さない） |

## Global Constraints

- 今のブランチ `fix/pair-schedule-freshness-threshold` にある未コミットの `.github/workflows/data-freshness.yml` には触れない。`git worktree add` で `origin/main` から `seo/game-name-aliases` を切り、そこで作業する（この計画文書もそこでコミットする）
- 画面の見た目と文言は変えない。変わるのはメタ description、`/about` の「別名・表記：」の行（別名が増えるぶん）、構造化データだけ
- 別名には、実際に検索される正しい表記だけを入れる（`site-config.ts` の既存方針）
- パッケージ操作は pnpm だけを使う。push 前に `pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint` を通す
- dev / preview サーバーは起動しない（`pnpm build` は確認のために回してよい）
- コミットの末尾は `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。PR タイトルはパッチの `N.N.N`（番号は PR 作成時に main の最新を見て決める。#538 で 2.5.10 が revert されている点に注意）

## ファイル計画

### フェーズA: 名称を `GAME_NAMES` から作る（出力を変えないリファクタ）

| 操作 | ファイル | 責務 |
|---|---|---|
| Test | `src/__tests__/site-seo.test.ts`（Create） | 先に今の出力を固定する。`SITE_DESCRIPTION` が今の `layout.tsx` の DESCRIPTION と同じ文字列であること、`buildSiteJsonLd()` が今の `jsonLd` と同じオブジェクトであること |
| Create | `src/lib/site-seo.ts` | `SITE_NAME`・`SITE_DESCRIPTION`（`gameFullWithShort` で組み立てる）・`buildSiteJsonLd()` を置く。`area-seo.ts`・`about-seo.ts` と同じく純関数 |
| Modify | `src/app/layout.tsx` | `SITE_NAME`・`DESCRIPTION`・`jsonLd` の直書きをやめて `site-seo.ts` から読む。フォントサブセットのコメントにある古い「ラサバ」を「ラスサバ」に直す（コメントだけの変更。実際のタブは `FilterBar.tsx:14` で「ラスサバ」） |
| Modify | `src/components/SeoContent.tsx` | 説明の段落にあるタイトル名を `gameFullWithShort` から作る。出力される文字列は同じ |
| Modify | `src/app/manifest.ts` | description のタイトル名を `GAME_NAMES[...].full` から作る。出力は同じ |
| Test | `src/__tests__/seo-content.test.tsx` | 既存のテストがそのまま通ること。正式名称が入っていることを確かめる1件を足す |

**コミット分割**
1. `refactor(seo): タイトル名を GAME_NAMES から組み立てる`

### フェーズB: 別名の追加と出し分け（出力が変わる）

| 操作 | ファイル | 責務 |
|---|---|---|
| Modify | `src/lib/site-config.ts` | `aliases` を検索されやすい順に並べ直し、イニブ側に `エクバ`・`EXVS2IB`・`エクバ2IB`・`インフィニットブースト` を足す。ラスサバ側は、今の県ページの description に出ている `ジョジョ ラストサバイバー` を先頭に足すだけにする。コメントに「並び順＝優先度」と上の表の方針を書く。`gameShortWithAliases(game, count)`（例：`イニブ（エクバ2・EXVS2IB）`）を足す |
| Modify | `src/lib/site-seo.ts` | `SITE_DESCRIPTION` のイニブ部分を `gameShortWithAliases` で別名1つ入りにする（例：`…INFINITEBOOST（イニブ・エクバ2）…`）。`SITE_KEYWORDS` を `GAME_NAMES` の short・full・aliases、汎用語（設置店舗・ゲームセンターなど）、`TWEET_HASHTAG` から作る。`buildSiteJsonLd()` は変えない |
| Modify | `src/app/layout.tsx` | `keywords` を `SITE_KEYWORDS` に置き換える |
| Modify | `src/lib/area-seo.ts` | `areaDescription`・`areaHubDescription` のタイトル名を `gameShortWithAliases` から作る（ラスサバは今と同じ表記、イニブは `イニブ（エクバ2・EXVS2IB）`） |
| Modify | `src/lib/about-seo.ts` | `buildAboutPageJsonLd` に `about: [VideoGame × 2]` を足す。`name` は正式名称、`alternateName` は `[short, ...aliases]`。`/about` の画面に出ている一覧と同じものを使う |
| Test | `src/__tests__/site-seo.test.ts` | description に `エクバ2` が入っていること。keywords にすべての別名が重複なしで入っていること。トップの JSON-LD に `alternateName` が無いこと |
| Test | `src/__tests__/area-seo.test.ts` | 県ページとハブの description に `エクバ2` が入っていて、ラスサバの表記が今と同じであること |
| Test | `src/__tests__/about-seo.test.ts` | `about` の `VideoGame` 2件の `alternateName` が `GAME_NAMES` と一致すること。`LocalBusiness` を含まない既存テストはそのまま |
| Test | `src/__tests__/seo-content.test.tsx` | 読み上げ用本文に別名（`エクバ2`・`EXVS2IB`）が入っていないこと（隠しテキストにしない方針の固定） |
| Verify | `src/__tests__/about-content.test.tsx` | `/about` の「別名・表記：」に新しい別名が出ること。既存の `toContain('EXVS2')` も通ること |

**コミット分割**
2. `feat(seo): タイトルの別名を description と /about の構造化データに出す`

（計画文書のコミット `docs(plan): game-name-aliases の実装計画` は実装の前に別に入れる）

## 実行順と確認

1. worktree を作って計画文書を `docs/plans/2026-11-18-game-name-aliases.md` に保存し、コミットする
2. フェーズAの後：`pnpm test`（`site-seo.test.ts` の固定値が通ること）と `pnpm exec tsc --noEmit`
3. フェーズBの後：`pnpm exec tsc --noEmit`・`pnpm test`・`pnpm lint`。そのあと `pnpm build` を回し、出力された HTML でトップの `<meta name="description">` と `/about` の `ld+json` を grep して中身を見る
4. PR タイトルは `N.N.N`（パッチ）
5. マージ後（本人が実施）：リッチリザルトテストで `/about` の構造化データにエラーが無いか見る。Search Console の URL 検査でトップと `/about` の再クロールを依頼する。数週間後、検索パフォーマンスで「エクバ」系の表示回数を確かめ、別名の並びを見直す

## 未決事項

- トップの description が長くなりすぎないか（今はおよそ110字）。検索結果で途中で切れるなら、別名は入れずに県ページ側だけにする
- 「エクバ」単体は旧作の検索と混ざる可能性がある。Search Console で流入を見て、合わなければ外す
