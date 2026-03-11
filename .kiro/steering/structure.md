# プロジェクト構成

## 構成方針

Next.js App Routerの規約に従う。ページ数が少ないシンプルなアプリのため、feature-firstではなく機能種別ごとの整理を採用。

## ディレクトリパターン

### ページ
**場所**: `src/app/`
**目的**: Next.js App Routerのルーティング
**例**: `page.tsx`（メインの地図ページ）

### コンポーネント
**場所**: `src/components/`
**目的**: 再利用可能なUIコンポーネント
**例**: 地図コンポーネント、店舗情報カード

### データ
**場所**: `src/data/`
**目的**: 静的な設置店舗データ（JSON/TS）
**例**: ラスサバ店舗リスト、イニブ店舗リスト

### 型定義
**場所**: `src/types/`
**目的**: 共有TypeScript型定義
**例**: 店舗データの型、地図関連の型

## 命名規約

- **ファイル**: コンポーネントはPascalCase（`MapView.tsx`）、その他はkebab-case
- **コンポーネント**: PascalCase
- **関数・変数**: camelCase
- **型・インターフェース**: PascalCase

## インポート整理

```typescript
// 外部ライブラリ
import { useEffect } from 'react'

// 内部モジュール（パスエイリアス）
import { Store } from '@/types/store'
import { MapView } from '@/components/MapView'

// 相対パス（同一ディレクトリ内）
import { helper } from './helper'
```

**パスエイリアス**:
- `@/`: `src/` にマッピング

## コード整理の原則

- コンポーネントは単一責任。地図の描画と店舗データの管理を分離
- 静的データはコンポーネントから分離して `src/data/` に配置
- 型定義を共有し、データの一貫性を保証

---
_パターンを文書化。ファイルツリーの列挙ではない。パターンに従う新規ファイルは更新不要_
