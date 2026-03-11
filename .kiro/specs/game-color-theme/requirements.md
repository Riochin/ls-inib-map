# Requirements Document

## Introduction
店舗の稼働タイトル構成に応じたカラーテーマを導入する。現在は単色のマーカーピンで店舗を区別しているが、グラデーションを用いたカラーテーマにより視覚的な識別性とデザイン品質を向上させる。

- 両タイトル稼働（ラスサバ＋イニブ）: 紫〜薄紫のグラデーション
- イニブのみ: 青〜白のグラデーション

カラーテーマはマーカー、InfoWindow内のバッジ、FilterBarのアクティブ状態など、UI全体で一貫して適用する。

## Requirements

### Requirement 1: マーカーカラーテーマ
**Objective:** ユーザーとして、マーカーの色で店舗の稼働タイトル構成を直感的に判別したい。地図上で一目で両タイトル店舗とイニブ専用店舗を区別できるようにするため。

#### Acceptance Criteria
1.1 When 両タイトル稼働店舗のマーカーが地図上に表示される, the マーカー shall 紫〜薄紫のカラーテーマで描画される
1.2 When イニブのみ稼働店舗のマーカーが地図上に表示される, the マーカー shall 青〜白のカラーテーマで描画される
1.3 The マーカーカラー shall 両タイトルとイニブのみの2パターンで視覚的に明確に区別可能である

### Requirement 2: InfoWindowバッジカラー
**Objective:** ユーザーとして、InfoWindow内のゲームタイトルバッジもカラーテーマに沿った色で表示されたい。マーカーとInfoWindowで一貫したカラーテーマにより混乱を防ぐため。

#### Acceptance Criteria
2.1 When InfoWindowが表示される, the ゲームタイトルバッジ shall マーカーと同じカラーテーマ体系に基づいた色で表示される
2.2 When 両タイトル稼働店舗のInfoWindowが表示される, the バッジ shall 紫系のカラーテーマで表示される
2.3 When イニブのみ稼働店舗のInfoWindowが表示される, the バッジ shall 青系のカラーテーマで表示される

### Requirement 3: FilterBarカラー連動
**Objective:** ユーザーとして、フィルタボタンのアクティブ状態がカラーテーマと連動してほしい。選択中のフィルタとマーカー色が対応することで直感的に操作できるため。

#### Acceptance Criteria
3.1 When 「すべて」フィルタが選択されている, the FilterBar shall 既存のニュートラルカラー（グレー系）でアクティブ状態を表示する
3.2 When 「イニブ」フィルタが選択されている, the FilterBar shall 青系のカラーテーマでアクティブ状態を表示する
3.3 When 「ラスサバ」フィルタが選択されている, the FilterBar shall 紫系のカラーテーマでアクティブ状態を表示する

### Requirement 4: 既存機能との互換性
**Objective:** 開発者として、カラーテーマ変更が既存機能に影響を与えないことを保証したい。リグレッションを防止するため。

#### Acceptance Criteria
4.1 The カラーテーマ変更 shall 既存のフィルタリング機能、InfoWindow表示、現在位置機能に影響を与えない
4.2 The アプリケーション shall カラーテーマ変更後もビルドエラーなく正常にビルドできる
4.3 The 既存テスト shall カラーテーマ変更後もすべてパスする
