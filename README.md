# LS × EXVS マップ

<img width="1376" height="768" alt="image" src="https://github.com/user-attachments/assets/6a8279c9-e9a3-487f-9bca-eaab710cdc29" />


[![Deploy](https://img.shields.io/badge/demo-Vercel-black)](https://ls-inib-map.vercel.app/)

ラスサバ（ジョジョの奇妙な冒険 ラストサバイバー）とイニブ（機動戦士ガンダム EXTREME VS.2 INFINITEBOOST）の設置店舗を地図上で検索できる Web アプリです。

**🔗 https://ls-inib-map.vercel.app/**

## 主な機能

- Google Maps 上に設置店舗をマーカー表示（関東エリア 260 店舗以上）
- タイトル別フィルタリング（ラスサバ / イニブ / すべて）
- 現在地取得＆自動ズーム
- 店舗名・住所・設置タイトルの詳細表示
- タイトルごとのカラーテーマ（紫：ジョジョ、青：ガンダム）
- モバイルファースト・レスポンシブ対応
- OGP メタデータ・SNS シェア対応

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript (strict) |
| 地図 | Google Maps JavaScript API / @vis.gl/react-google-maps |
| スタイル | Tailwind CSS 4 |
| テスト | Vitest |
| ホスティング | Vercel |

## セットアップ

### 必要な環境変数

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-map-id
```

### インストール・起動

```bash
npm install
npm run dev        # 開発サーバー起動 (http://localhost:3000)
```

### その他のコマンド

```bash
npm run build      # プロダクションビルド
npm start          # プロダクションサーバー起動
npm run lint       # ESLint 実行
npm test           # テスト実行
npm run test:watch # テスト (watch モード)
```

## ライセンス

Private
