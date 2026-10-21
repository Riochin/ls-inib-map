# アプリ紹介動画（Remotion）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 本番サイトの実操作クリップに LP と同じテロップを重ねた縦動画（1080×1920・約24秒）を `video/` の Remotion プロジェクトで書き出せるようにする。

**Architecture:** `scripts/lib/headless-chrome.mjs` に Chrome 起動・CDP 接続を集約し、`video/scripts/record-clips.mjs` がスクリーンキャストで 3 本のクリップ（MP4＋タップ JSON）を作る。`video/src` の Remotion 構成は `timeline.ts` を単一ソースにシーンを `Sequence` で並べ、`ClipScene` が `OffthreadVideo`＋スマホ枠＋テロップ＋タップ表示を描く。文言は `@/lib/about-copy` を alias 経由で import する。

**Tech Stack:** Remotion 4.0.525（`remotion` / `@remotion/cli` / `@remotion/google-fonts`）、React 19、TypeScript、Node 23（グローバル `WebSocket` / `fetch`）、Chrome DevTools Protocol

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-09-17-app-demo-video-design.md`
- `video/` は独立 package。root の `package.json` / lockfile / lint / test / build / Vercel に影響させない
- 生成物（`video/node_modules` `video/out` `video/public/clips` `video/public/assets`）は root `.gitignore` に追加
- 文言は `src/lib/about-copy.ts` を単一ソースとし、動画側に文言をコピーしない（件数だけ撮影時 JSON から）
- pnpm のみ使う。コミットは論理単位（本計画は最終的に 2〜3 コミットに squash）。末尾に `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- dev / preview サーバーはこちらで起動しない（Remotion Studio も起動しない。検証は `tsc` と `remotion render` と書き出しフレームの目視）

## 実施結果

全タスク完了（2026-09-17）。`pnpm record` → `pnpm render` で `out/app-demo.mp4`（24.0 秒・1080×1920・約 8MB）を書き出し、各シーンのフレームを目視確認済み。
設計からの変更点は設計書の「補足（実装時に分かったこと）」に記載。

## タスク

### Task 1: Chrome 起動・CDP 接続の共通化

- Create `scripts/lib/headless-chrome.mjs`: `launchChrome({ port, profileDir, windowSize })` → `{ send, evaluate, on, close }`。`on(method, handler)` で `Page.screencastFrame` などのイベントを購読できるようにする
- Modify `scripts/shoot-about-screens.mjs`: 接続部分を共通化に置き換え（挙動は同じ）
- 検証: `node scripts/shoot-about-screens.mjs detail` が完走し `public/about/feature-detail.webp` が更新される（差分は撮影時刻分だけ）

### Task 2: `video/` の Remotion プロジェクト骨組み

- Create `video/package.json`（scripts: `record` / `studio` / `render` / `typecheck` / `ffmpeg`）、`video/tsconfig.json`（`@/*` → `../src/*`）、`video/remotion.config.ts`（alias）、`video/src/index.ts`、`video/src/Root.tsx`、`video/src/timeline.ts`
- root `.gitignore` に生成物を追加
- `cd video && pnpm install` → `pnpm typecheck` が通る

### Task 3: 撮影スクリプト `video/scripts/record-clips.mjs`

- `Page.startScreencast`（jpeg・quality 90）でフレームを受け取り `Page.screencastFrameAck`。時刻付きで保存
- 30fps に等間隔リサンプル → 連番 JPEG → `pnpm exec remotion ffmpeg -framerate 30 -i ... -c:v libx264 -pix_fmt yuv420p` で MP4
- タップ記録: `tap(label|selector)` ヘルパーが要素の中心座標（CSS px）と時刻を JSON に積む。ピンは `[aria-label*="タイトーステーション渋谷"]` 等の要素を実クリック
- 件数: 画面の「全 N 件」から数値を取り JSON に入れる
- 3 シナリオ（map / filter / detail）を設計どおり実装。LP ヒーロー画像と OGP を `video/public/assets/` にコピー
- 検証: 3 本の MP4 と JSON が生成され、`remotion ffmpeg -i clip.mp4` で長さが約 6 秒

### Task 4: Remotion コンポーネント

- `components/fonts.ts`（google-fonts 読み込み）、`PhoneFrame.tsx`、`Caption.tsx`（下から出る 2 行テロップ・「10秒」強調対応）、`TapIndicator.tsx`（タップ座標にリング）
- `scenes/TitleScene.tsx`（見出し＋ヒーロー画像のスマホ枠がせり上がる）、`ClipScene.tsx`（`OffthreadVideo`＋枠＋テロップ＋タップ）、`EndScene.tsx`（OGP 風・URL・ハッシュタグ）
- `AppDemo.tsx` で `timeline.ts` に従い `Sequence` を並べ、シーン間 0.3 秒フェード
- 検証: `pnpm typecheck`、`pnpm render`（`out/app-demo.mp4`）完走、`remotion ffmpeg` で 5 フレームを PNG に抜いて目視

### Task 5: ドキュメントと仕上げ

- `video/README.md`（前提: macOS の Chrome、手順: install → record → studio → render、X への投稿サイズ）
- 設計書・計画書の最終更新、squash して PR `2.5.4`（base: `main`。`ver2.5.3` マージ後にリベース）
