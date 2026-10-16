# video/ — アプリ紹介動画（Remotion）

X 投稿用の縦動画（1080×1920・30fps・約 24 秒・音なし）を書き出す独立パッケージ。
本番サイトを実際に操作した画面（3 クリップ）に、LP（`/about`）と同じ言葉のテロップとスマホ枠を重ねる。

設計書: `../docs/superpowers/specs/2026-09-17-app-demo-video-design.md`

## 前提

- macOS に Google Chrome（`/Applications/Google Chrome.app`）。撮影はヘッドレス Chrome を CDP で操作する
- Node 22 以上（グローバル `fetch` / `WebSocket`）、pnpm
- このディレクトリは root とは別の package。root の lint / test / build / Vercel には含まれない

## 手順（すべて `video/` で実行）

```bash
pnpm install          # 初回のみ
pnpm record           # 本番サイトから 3 クリップを撮影 → public/clips/*.mp4 + *.json、LP 画像と OGP を public/assets/ へ
pnpm studio           # プレビュー（任意。ブラウザで Remotion Studio が開く）
pnpm render           # out/app-demo.mp4 を書き出す（初回は描画用 Chrome を自動取得）
```

`pnpm record map` のようにクリップ名（`map` / `filter` / `detail`）を指定すると 1 本だけ撮り直せる。

## クリップと撮影内容

| クリップ | 内容 |
|---|---|
| `map` | 日本全体で 1 秒静止 → 東京圏のまとまったピンを中心に 4 段ズームイン |
| `filter` | 絞り込みボタン → ラスサバ・4台〜・録画台あり → 「N件を表示」 |
| `detail` | namco松戸（周囲に他店が無い単独ピン）をタップ → 店舗パネル → 「詳細を見る」 → 詳細モーダル |

- 撮影スクリプトは操作のたびに「何フレーム目に画面のどこを押したか」を JSON に記録し、Remotion 側がタップ表示（紫のリング）に使う
- 店舗数のテロップ（「全国◯店舗が一目でわかる」）は撮影時に画面の「全 N 件」から取った値を使う
- 店舗データは毎週更新されるため、画像が古くなったら `pnpm record` で撮り直して `pnpm render` する

## 構成

- `scripts/record-clips.mjs` — 撮影（Chrome 起動・接続は `../scripts/lib/headless-chrome.mjs` を共用）
- `src/timeline.ts` — シーンの並びと長さ（フレーム）の単一ソース
- `src/AppDemo.tsx` — シーンを `Sequence` で並べ、切り替えに 0.3 秒のフェード
- `src/scenes/` — `TitleScene`（見出し＋ヒーロー画像）、`ClipScene`（クリップ＋テロップ＋タップ表示）、`EndScene`（OGP・URL・ハッシュタグ）
- `src/components/` — `PhoneFrame`（LP と同じ端末枠）、`Caption`、`TapIndicator`、`clipMeta`（JSON 読込）、`fonts`（M PLUS Rounded 1c / Noto Sans JP）、`theme`
- 文言は `../src/lib/about-copy.ts` を `@/lib/about-copy` として import（webpack alias・tsconfig paths）。動画側に文言を持たない

## git に入れないもの

`node_modules/`・`out/`・`public/clips/`・`public/assets/` は生成物（root の `.gitignore`）。撮影と書き出しは手元で行い、できた MP4 を X に投稿する。
