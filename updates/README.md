# updates/ — リリース告知素材

バージョンごとのX告知に使う素材置き場。1リリース ＝ フライヤー1枚 ＋ 投稿文1つ。

## 構成

```
updates/
├── templates/              定型（コピー元）
│   ├── announcement.md     リリース告知 投稿文の定型（2.0スタイル）
│   └── override-report.md  台数オーバーライド反映報告の定型
├── v○.○/                   バージョンごとの告知素材
│   ├── post.md             そのバージョンの投稿本文
│   └── flyer.html          X投稿用の紹介画像（1200×675・スクショして使う）
└── override-reports/       台数オーバーライド反映報告（版とは別軸・月次）
    └── YYYY-MM.md          その回の反映報告ドラフト
```

## 新バージョンを出すとき

1. `v○.○/` フォルダを作る
2. `templates/announcement.md` をコピーして `v○.○/post.md` を作り、目玉・熱量を埋める
3. 直近の `flyer.html`（例 `v2.1/flyer.html`）をコピーして `v○.○/flyer.html` を作り、機能カードを差し替える
4. フライヤーをブラウザで開き `#flyer` 枠（1200×675）をスクショ
5. 投稿本文＋画像でXに投稿（タグは `#ラストサバイニブ #ジョジョLS #イニブ` 固定）

## 台数オーバーライド反映報告を出すとき

- `templates/override-report.md` をコピーして `override-reports/YYYY-MM.md` を作り、反映した台数と提供者を埋める
