# updates/ — リリース告知素材

バージョンごとのX告知に使う素材置き場。1リリース ＝ フライヤー1枚 ＋ 投稿文1つ。

## 構成

```
updates/
├── templates/              定型（コピー元）
│   ├── announcement.md     リリース告知 X投稿文の定型（2.0スタイル・スレッドの親）
│   ├── discord.md          リリース告知 Discord投稿文の定型（2.1スタイル）
│   ├── flyer.html          紹介画像フライヤーの定型（1200×675・コピー元）
│   └── override-report.md  台数オーバーライド反映報告の定型（Xスレッドのリプ1/2）
├── v○.○/                   バージョンごとの告知素材
│   ├── post.md             そのバージョンのX投稿本文（スレッド全体）
│   ├── discord.md          そのバージョンのDiscord投稿本文
│   └── flyer.html          X投稿用の紹介画像（1200×675・スクショして使う）
└── override-reports/       台数オーバーライド反映報告（版とは別軸・月次）
    └── YYYY-MM.md          その回の反映報告ドラフト
```

## 新バージョンを出すとき

`verN.N` の PR が main にマージされると、`.github/workflows/release-announcement.yml` が
**告知チェックリストIssueの発行・X/Discord下書きのコメント・`v○.○/post.md`＋`discord.md` のドラフトPR**
までを自動で用意する。以下はその下書きを仕上げて投稿するまでの流れ:

1. 自動作成された「📣 ver○.○ 告知チェックリスト」Issue と、`ver○.○-release` ドラフトPRを開く
2. `v○.○/post.md`（Xスレッド：親＝リリース告知／台数修正があればリプ1・リプ2）の目玉・熱量・メンションを仕上げる
3. `v○.○/discord.md`（Discord文面）を仕上げる
4. `v○.○/flyer.html`（`templates/flyer.html` から自動ドラフト済）の `[差し替え]` 箇所・機能カードを仕上げる
5. フライヤーをブラウザで開き `#flyer` 枠（1200×675）をスクショ
6. X（タグ `#ラストサバイニブ #ジョジョLS #イニブ` 固定）→ Discordコミュニティ の順で投稿し、Issueのチェックを埋める

> パッチ（`N.N.N`）のマージでは告知は発行されない。手動で出したい場合はテンプレからコピーして作る。

## 台数オーバーライド反映報告を出すとき

- `templates/override-report.md` をコピーして `override-reports/YYYY-MM.md` を作り、反映した台数と提供者を埋める
- `src/data/overrides.json` を main に更新すると `.github/workflows/override-tweet-reminder.yml` が発火し、
  差分から **修正ツイートの2・3ツイート目の下書き**（店舗名・台数つき）をIssueに自動で出す（AI不使用）。
  Issueの下書きを確認して投稿し、済んだらクローズする。
