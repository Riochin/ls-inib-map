# Research & Design Decisions

## Summary
- **Feature**: `game-color-theme`
- **Discovery Scope**: Simple Addition
- **Key Findings**:
  - Google Maps `Pin`コンポーネントは単色のみ対応。グラデーションにはカスタムHTML要素を`AdvancedMarker`の子として渡す必要がある
  - 現在のデータではラスサバのみの店舗は0件。両タイトルとイニブのみの2パターンが実質的なカラーテーマ
  - `marker-color.ts`の色定数とロジックを変更し、StoreMarkerのレンダリングを更新するだけで対応可能

## Research Log

### Google Maps Pinコンポーネントのグラデーション対応
- **Context**: 要件でグラデーションカラーテーマが求められている
- **Findings**:
  - `Pin`コンポーネントの`background`/`borderColor`/`glyphColor`は単色（CSS color string）のみ受付
  - グラデーションを実現するには`AdvancedMarker`の子要素としてカスタムHTML（div + CSS gradient）を渡す
  - `CurrentLocationMarker`で既にカスタムHTML要素パターンを使用済み
- **Implications**: `Pin`を廃止し、カスタムHTMLマーカーに切り替える。既存パターンを踏襲

### カラーテーマ設計
- **Context**: 両タイトル→紫〜薄紫、イニブのみ→青〜白のグラデーション
- **Findings**:
  - 紫系: `#7B2FBE`〜`#C4A0E8`（紫→薄紫）
  - 青系: `#2563EB`〜`#DBEAFE`（青→薄い青白）
  - マーカーサイズは小さいため、2色のシンプルなlinear-gradientが最適
- **Implications**: CSS `linear-gradient`で上→下のグラデーションを適用

## Design Decisions

### Decision: カスタムHTMLマーカーへの切り替え
- **Context**: Pinコンポーネントではグラデーション不可
- **Alternatives Considered**:
  1. SVGアイコンでグラデーション表現
  2. カスタムHTML div + CSSグラデーション
- **Selected Approach**: カスタムHTML div + CSSグラデーション
- **Rationale**: CurrentLocationMarkerで同パターンを使用済み。シンプルで保守性が高い
- **Trade-offs**: Pinのデフォルトスタイル（影・形状）を失うが、カスタムCSSで同等の視認性を確保

## Risks & Mitigations
- グラデーションマーカーが小さすぎて色の区別がつかない → マーカーサイズを適切に設定し視認性テスト
- Pinコンポーネント廃止による既存テストへの影響 → marker-color.tsのテストを更新
