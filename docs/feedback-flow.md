# フィードバック運用フロー

ユーザーヒアリング → メモ → 構造化Issue → データ反映 の流れと、その下準備をまとめる。
バックエンド・DBは持たず、**GitHub Issue ＋ Actions ＋ 手動オーバーライド**で回す。

## 全体像

```
[外出先・スマホ]                 [GitHub Actions]              [机・PC]
ヒアリング                                                    
  └ memoテンプレでIssue open  ──▶  Claudeが構造化Issue作成   ──▶  Claude/GUIでoverrides.json反映
     (memoラベル/自分)              元メモはクローズ                 → コミット → デプロイで地図に反映
```

- **キャプチャ（スマホ）**= GitHub Issue の `memo` テンプレ。2種類ある：
  - `memo.yml`（店舗情報メモ）→ 構造化後 `要反映`（データ反映へ）
  - `feature-memo.yml`（機能要望メモ）→ 構造化後 `改善要望`（バックログへ）
  - どちらも `memo` ラベルで起票し、Actionが内容から種別を判定して振り分ける。localhostのGUIはPC専用なのでここでは使わない。
- **整形（自動）**= `.github/workflows/structure-memo.yml`（Claude Code Action）。
- **反映（PC）**= 店舗情報は `/admin/overrides`（localhost GUI）か Claude に `src/data/overrides.json` を編集してもらう。機能要望は `改善要望` Issue として積む。

## 下準備（最初の1回）

1. **OAuthトークン生成**（Claude Pro/Max が必要）:
   ```bash
   claude setup-token
   ```
2. リポジトリの **Secrets** に `CLAUDE_CODE_OAUTH_TOKEN` を登録（Settings → Secrets and variables → Actions）。
3. **ラベル作成**:
   ```bash
   gh label create memo --color BFD4F2 --description "ヒアリング生メモ"
   gh label create 要反映 --color FBCA04 --description "構造化済み・データ反映待ち"
   gh label create 店舗報告 --color 0E8A16 --description "店舗情報の報告"
   gh label create 改善要望 --color 1D76DB --description "機能要望・改善アイデア"
   ```
4. （任意）スマホのホーム画面に新規Issueリンクをブックマーク:
   - 店舗情報メモ: `https://github.com/<owner>/<repo>/issues/new?template=memo.yml`
   - 機能要望メモ: `https://github.com/<owner>/<repo>/issues/new?template=feature-memo.yml`

## 日々の運用

1. 気づいたことを、スマホから自分のアカウントでIssue化（店舗情報＝`memo.yml` / 機能要望＝`feature-memo.yml`）。
2. Actionsが内容から種別を判定し、構造化Issue（店舗＝`要反映` / 要望＝`改善要望`）を作って元メモをクローズ。
3. 机で `要反映` Issue を確認し、反映する（`改善要望` はバックログとして必要時に着手）:
   - **GUI**: `pnpm dev` → `http://localhost:3000/admin/overrides` で店舗を検索→台数/出どころ/メモを入力→保存。
   - **Claude**: 「この報告を overrides に反映して」と Issue を貼る → `src/data/overrides.json` を編集してもらう。
4. `overrides.json` をコミット＆プッシュ → Vercel デプロイで地図に反映。反映済みIssueはクローズ。

## メモ:Claude取り込みの振り分け基準

- **即反映（override直編集 / GUI）**: 台数の修正・閉店・移設など、データに直接効く確度の高い情報。
- **積む（`要反映` のまま）**: 設備など現状スキーマに無い項目、要確認・裏取りが必要なもの。

## ガード（重要）

`structure-memo.yml` は次を満たす時だけ発火する。崩さないこと。

- `memo` ラベル付き **かつ** 投稿者が `OWNER`（他人のIssueでAIが動かない）。
- 生成する構造化Issueに `memo` を付けない（無限ループ防止）。
- Actionはデータ改変をしない（Issue操作のみ）。反映は人/Claudeが机で行う。
