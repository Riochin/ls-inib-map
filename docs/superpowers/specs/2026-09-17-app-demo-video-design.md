# アプリ紹介動画（Remotion）設計書

作成日: 2026-09-17
対象ブランチ: `ver2.5.4`（`ver2.5.3` から分岐。PRタイトルは `2.5.4`）

## 目的

X 投稿用に、アプリ（`/` の地図）の使い方を見せる縦動画（1080×1920・約24秒・音なし）を作る。
本番サイトを実際に操作した画面を素材にし、LP（`/about`）と同じ言葉・同じスマホ枠で見せて、告知と LP の印象を揃える。

## 決定事項（ブレスト結果）

| 論点 | 決定 |
|---|---|
| 用途 | X の投稿。縦 9:16、20〜25 秒、ミュート再生でも伝わるよう大きめのテロップ |
| 中身 | アプリの使い方（地図 → 絞り込み → 店舗詳細）。`/about` のスクロール紹介はしない |
| 素材 | 本番サイトをヘッドレス Chrome で操作しながら連続キャプチャした実操作クリップ。静止画のアニメ化は保険 |
| 置き場所 | このリポジトリの `video/` 配下に独立した package（アプリ本体の依存・Vercel ビルドに影響させない） |
| 道具 | Remotion 4（Chrome 自動取得・ffmpeg 同梱）。フォントは `@remotion/google-fonts` の M PLUS Rounded 1c / Noto Sans JP |

## 設計1: シーン割りとテロップ

縦 1080×1920、30fps、約 24 秒、音なし。テロップは LP の文言（`src/lib/about-copy.ts`）を使う。

| # | 秒 | 画面（スマホ枠の中） | テロップ |
|---|---|---|---|
| 0 | 0〜3 | 白背景に見出し。下からスマホ枠（日本全体の地図＝LP のヒーロー画像）がせり上がる | 「戦場選びを / サクッと10秒に。」（黒、「10秒」だけ紫）＋小さく「ラスサバ・イニブ 設置店舗マップ」 |
| 1 | 3〜9 | クリップ map: 日本全体 → 関東へズーム → まとまったピンがほどける | 「全国◯店舗が一目でわかる」（◯は撮影時の件数を JSON から） |
| 2 | 9〜15 | クリップ filter: 絞り込みボタン → モーダル → ラスサバ・4台〜・録画台あり → 「N件を表示」→ ピンが減る | 「エリア・現在地・台数で / 簡単に絞り込める」 |
| 3 | 15〜21 | クリップ detail: ピンをタップ → 店舗詳細 → 決済・録画台の欄まで 1 段スクロール | 「出どころつきの情報で / 安心して行ける」 |
| 4 | 21〜24 | OGP と同じキービジュアル風。URL とハッシュタグ | 「lsib.world」「#ラストサバイニブ」 |

見せ方:
- スマホ枠は LP の `PhoneFrame` と同じ見た目（濃いグレーのベゼル・角丸）。画面中央に大きく置き、テロップは枠の上に 2 行まで
- 見出しは M PLUS Rounded 1c、本文は Noto Sans JP。色はブランド紫 `#7B2FBE` と黒
- シーン切り替えは 0.3 秒のフェード。テロップは下から軽く出る。派手な動きはつけない
- タップ位置に小さな丸（タップ表示）を出す。位置と時刻は撮影スクリプトが JSON に記録したものを使う
- 店舗数は撮影時の画面の件数で固定（動画は作り直さない限り変わらない）

## 設計2: 撮影パイプライン

- Chrome DevTools Protocol の `Page.startScreencast` で操作中の画面を時刻付き JPEG として受け取り、30fps の等間隔に並べ直して連番画像にし、Remotion 同梱の ffmpeg（`remotion ffmpeg`）で H.264 MP4 にする
- 画面は iPhone 相当 375×812・3 倍密度（1125×2436）。オンボーディング／新機能モーダルは localStorage を先に埋めて出さない（`shoot-about-screens.mjs` と同じ）
- 操作のたびに「何秒目に画面のどこを押したか」を JSON に記録する。店舗詳細は URL ではなくピンの要素を実クリックして開き、タップ位置を取る
- 文字選択が残る問題は撮影前に選択解除で防ぐ

| クリップ | 操作 | 長さ |
|---|---|---|
| map | 日本全体で 1 秒静止 → 関東へズームイン 4 段 → 1.5 秒静止 | 約 6 秒 |
| filter | 絞り込みボタン → ラスサバ・4台〜・録画台あり → 「N件を表示」→ 1.5 秒静止 | 約 6 秒 |
| detail | 渋谷のピンをタップ → 詳細 → 1 段スクロール → 1.5 秒静止 | 約 6 秒 |

- シーン 0・4 は撮影せず、LP のヒーロー画像（`public/about/hero-map.webp`）と OGP（`src/app/opengraph-image.png`）を使う。撮影スクリプトが `video/public/assets/` へコピーする
- 出力 `video/public/clips/{map,filter,detail}.mp4` と同名 `.json`（fps・フレーム数・タップ・件数）。git には入れず（gitignore）、コマンド 1 つで撮り直す
- Chrome の起動・接続部分は `scripts/lib/headless-chrome.mjs` に切り出し、`scripts/shoot-about-screens.mjs` と `video/scripts/record-clips.mjs` の両方から使う

## 設計3: プロジェクト構成と書き出し

```
video/
├── package.json          独立 package（remotion / @remotion/cli / @remotion/google-fonts / react / react-dom / typescript）
├── tsconfig.json         `@/*` → `../src/*`（LP の文言を単一ソースのまま import する）
├── remotion.config.ts    webpack alias `@` → `../src`
├── README.md             撮影・プレビュー・書き出しの手順
├── scripts/record-clips.mjs
├── public/               staticFile の置き場（clips/ と assets/ は生成物・gitignore）
└── src/
    ├── index.ts          registerRoot
    ├── Root.tsx          Composition "AppDemo"（1080×1920・30fps・シーン合計のフレーム数）
    ├── AppDemo.tsx       Sequence でシーンを並べる
    ├── timeline.ts       シーンの開始・長さ（フレーム）の単一ソース
    ├── scenes/TitleScene.tsx / ClipScene.tsx / EndScene.tsx
    └── components/PhoneFrame.tsx / Caption.tsx / TapIndicator.tsx / fonts.ts
```

- コマンド（`video/` で実行）: `pnpm install` → `pnpm record`（撮影）→ `pnpm studio`（プレビュー）→ `pnpm render`（`out/app-demo.mp4`）
- `video/` の依存は root の `pnpm-lock.yaml` と分離（独立 package・独自 lockfile）。root の lint / test / build / Vercel には含めない
- 検証: `video/` で `tsc --noEmit`、`remotion render` が完走すること、書き出した動画から数フレームを画像にして見た目を確認（サーバー起動は不要）
- 生成物（`video/out/`、`video/public/clips/`、`video/public/assets/`、`video/node_modules/`）は gitignore

## やらないこと

- 音声・BGM、ナレーション
- `/about` ページ自体の録画
- CI での自動レンダリング（手元で書き出して X に投稿する）
