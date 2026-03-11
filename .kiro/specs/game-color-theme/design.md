# Design Document

## Overview
**Purpose**: 店舗の稼働タイトル構成に応じたグラデーションカラーテーマを導入し、地図マーカー・InfoWindowバッジ・FilterBarの色を統一する。
**Users**: ラスサバ・イニブプレイヤーが、地図上で店舗の稼働タイトルを直感的に判別する。
**Impact**: 既存の単色マーカー（Pin）をカスタムHTMLグラデーションマーカーに置き換え、UI全体のカラーテーマを統一する。

### Goals
- 両タイトル稼働店舗を紫〜薄紫グラデーションで表示
- イニブのみ稼働店舗を青〜白グラデーションで表示
- マーカー・バッジ・FilterBarで一貫したカラーテーマ

### Non-Goals
- ラスサバのみ店舗の独自カラーテーマ（現在0件のため）
- マーカーアニメーション
- ダークモード対応

## Architecture

### Existing Architecture Analysis
- `marker-color.ts`: 稼働タイトルに応じた単色を返す`getMarkerColor`関数
- `StoreMarker.tsx`: `Pin`コンポーネントで単色マーカーを描画
- `FilterBar.tsx`: アクティブフィルタはグレー系の単色
- `CurrentLocationMarker.tsx`: カスタムHTML要素による青い円マーカー（グラデーションマーカーの参考パターン）

### Architecture Pattern & Boundary Map
既存アーキテクチャを維持し、カラーテーマ定義の拡張とマーカー描画方式の変更のみ行う。

**Architecture Integration**:
- Selected pattern: 既存パターンの拡張（色定数の変更 + マーカー描画方式の変更）
- 既存パターン維持: コンポーネント分離、カラーロジックの`marker-color.ts`集約
- 新規コンポーネント: なし（既存コンポーネントの修正のみ）

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Frontend | @vis.gl/react-google-maps v1.7.1 | AdvancedMarkerでカスタムHTML描画 | Pinは廃止しカスタムdivに変更 |
| Styling | Tailwind CSS 4 | グラデーション・バッジ色の適用 | `bg-gradient-to-b`等を使用 |

## Requirements Traceability

| Requirement | Summary | Components | Interfaces |
|-------------|---------|------------|------------|
| 1.1, 1.2, 1.3 | マーカーカラーテーマ | marker-color.ts, StoreMarker | ColorTheme型, getMarkerTheme |
| 2.1, 2.2, 2.3 | InfoWindowバッジカラー | StoreMarker | getBadgeColors |
| 3.1, 3.2, 3.3 | FilterBarカラー連動 | FilterBar | getFilterActiveColor |
| 4.1, 4.2, 4.3 | 既存機能互換性 | 全コンポーネント | テスト検証 |

## Components and Interfaces

| Component | Domain | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------|--------|--------------|------------------|-----------|
| marker-color.ts | Lib | カラーテーマ定義と取得 | 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3 | Store型 (P0) | Service |
| StoreMarker | UI | グラデーションマーカーとバッジの描画 | 1.1, 1.2, 2.1, 2.2, 2.3 | marker-color.ts (P0), AdvancedMarker (P0) | State |
| FilterBar | UI | フィルタボタンのカラーテーマ連動 | 3.1, 3.2, 3.3 | marker-color.ts (P1) | State |

### Lib

#### marker-color.ts

| Field | Detail |
|-------|--------|
| Intent | 稼働タイトル構成に応じたカラーテーマ情報を提供する |
| Requirements | 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3 |

**Responsibilities & Constraints**
- カラーテーマの一元管理（マーカー・バッジ・フィルタ用の色を統一的に提供）
- 既存の`getMarkerColor`と`getGameLabel`のインターフェースを拡張

**Contracts**: Service [x]

##### Service Interface
```typescript
interface ColorTheme {
  /** グラデーション開始色（上/左） */
  gradientFrom: string
  /** グラデーション終了色（下/右） */
  gradientTo: string
  /** バッジ背景色 */
  badgeBg: string
  /** バッジテキスト色 */
  badgeText: string
  /** フィルタアクティブ背景色 */
  filterActiveBg: string
  /** フィルタアクティブテキスト色 */
  filterActiveText: string
}

/** 店舗の稼働タイトル構成からカラーテーマを取得 */
function getMarkerTheme(store: Store): ColorTheme

/** フィルタ選択肢に応じたアクティブカラーを取得 */
function getFilterActiveColor(filter: FilterOption): { bg: string; text: string }

/** 既存互換: 単色マーカー色を返す（廃止予定だがテスト互換のため残す場合） */
function getMarkerColor(store: Store): string

/** 既存互換: ゲームラベルを返す */
function getGameLabel(game: GameTitle): string
```

**Implementation Notes**
- カラー定数:
  - 両タイトル: `gradientFrom: '#7B2FBE'`, `gradientTo: '#C4A0E8'`, `badgeBg: '#7B2FBE'`
  - イニブのみ: `gradientFrom: '#2563EB'`, `gradientTo: '#DBEAFE'`, `badgeBg: '#2563EB'`
- `getMarkerColor`は`getMarkerTheme`の`gradientFrom`を返すことで後方互換を維持

### UI

#### StoreMarker

| Field | Detail |
|-------|--------|
| Intent | グラデーションカスタムマーカーとカラーテーマ連動バッジを描画する |
| Requirements | 1.1, 1.2, 2.1, 2.2, 2.3 |

**Responsibilities & Constraints**
- `Pin`コンポーネントを廃止し、カスタムHTMLマーカー（div + CSSグラデーション）に変更
- InfoWindow内のゲームタイトルバッジをカラーテーマに連動
- マーカーは視認性を確保するため適切なサイズ・影を設定

**Implementation Notes**
- マーカー: `div`にCSSの`background: linear-gradient(to bottom, gradientFrom, gradientTo)`を適用
- マーカー形状: ドロップピン型またはcircle型（周囲との区別のため影付き）
- バッジ: `ColorTheme.badgeBg`を`background-color`に使用
- `Pin`インポートを削除

#### FilterBar（修正）

| Field | Detail |
|-------|--------|
| Intent | フィルタボタンのアクティブ状態色をカラーテーマに連動させる |
| Requirements | 3.1, 3.2, 3.3 |

**Implementation Notes**
- `getFilterActiveColor`を使用してアクティブボタンの背景色・テキスト色を動的に設定
- 「すべて」: 既存のグレー系（`bg-gray-900 text-white`）を維持
- 「ラスサバ」: 紫系（`bg-purple-700 text-white`）
- 「イニブ」: 青系（`bg-blue-600 text-white`）

## Testing Strategy

### Unit Tests
- `getMarkerTheme`: 両タイトル店舗で紫系テーマ、イニブのみ店舗で青系テーマが返ることを検証
- `getFilterActiveColor`: 各フィルタ選択肢で正しい色が返ることを検証
- `getMarkerColor`: 後方互換として正しい色が返ることを検証（既存テスト更新）

### Build & Regression
- `npm run build`でビルドエラーがないことを確認
- 既存テストがすべてパスすることを確認
