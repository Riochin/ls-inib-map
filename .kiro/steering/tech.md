# 技術スタック

## アーキテクチャ

サーバーレスの静的Webアプリケーション。APIサーバーは持たず、設置店舗データは静的ファイルとしてバンドルする。Vercelにデプロイ。

## コア技術

- **言語**: TypeScript
- **フレームワーク**: Next.js (App Router)
- **ホスティング**: Vercel
- **地図API**: Google Maps JavaScript API（またはスマホUXに優れた代替）

## 主要ライブラリ

- 地図描画ライブラリ（Google Maps React wrapper等）
- スタイリング: 軽量CSSソリューション（Tailwind CSS推奨）

## 開発基準

### 型安全性
- TypeScript strict mode
- 店舗データに明確な型定義

### コード品質
- ESLint + Prettier
- Next.js推奨の設定に準拠

## 開発環境

### 必須ツール
- Node.js 20+
- npm / pnpm

### 基本コマンド
```bash
# 開発: npm run dev
# ビルド: npm run build
# リント: npm run lint
```

## 主要な技術判断

- **APIサーバーなし**: ユーザー規模が小さく、データ更新頻度も低いため静的データで十分
- **Next.js選定**: Vercelデプロイとの親和性、SSG対応
- **スマホファースト**: ターゲットユーザーの主要アクセス手段がスマートフォン

---
_標準とパターンを文書化。すべての依存関係を列挙しない_
