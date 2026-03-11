# 調査・設計判断ログ

## サマリー
- **フィーチャー**: `nearby-store-locator`
- **調査スコープ**: Extension（既存システムへの拡張）
- **主要な発見**:
  - @vis.gl/react-google-mapsの`useMap`フックで地図のプログラマティック制御が可能
  - Geolocation APIはHTTPS環境でのみ動作（Vercelデプロイで対応済み）
  - MapViewは現在非制御モード（`defaultCenter`/`defaultZoom`）のため、位置移動には`useMap`フックによる命令的操作が必要

## 調査ログ

### @vis.gl/react-google-mapsの地図制御方法
- **背景**: 現在位置取得後に地図の中心を移動する手段の調査
- **参照**: @vis.gl/react-google-maps公式ドキュメント
- **発見**:
  - `useMap()`フックでgoogle.maps.Mapインスタンスを取得可能
  - `map.panTo(position)`で滑らかに中心を移動
  - `map.setZoom(level)`でズームレベル変更
  - 非制御モード（`defaultCenter`）のまま命令的に操作するのが推奨パターン
- **設計への影響**: MapView内部で`useMap`を使い、外部からのトリガーでpanTo/setZoomを実行

### Geolocation API
- **背景**: ブラウザの現在位置取得APIの制約確認
- **参照**: MDN Web Docs — Geolocation API
- **発見**:
  - `navigator.geolocation.getCurrentPosition()`で一回の位置取得
  - HTTPS必須（Vercelデプロイで自動対応）
  - 精度はデバイスに依存（GPS、Wi-Fi、セルラー）
  - エラーコード: PERMISSION_DENIED(1), POSITION_UNAVAILABLE(2), TIMEOUT(3)
- **設計への影響**: カスタムフック`useGeolocation`で状態管理とエラーハンドリングを統合

### 現在地マーカーの表現
- **背景**: 店舗マーカーと区別可能な現在地表示方法
- **参照**: Google Mapsのデフォルト青い丸アイコンのパターン
- **発見**:
  - AdvancedMarkerにカスタムHTMLを渡すことで自由なスタイリングが可能
  - 青い円（パルスアニメーション付き）が一般的な現在地表現
  - CSSアニメーションでパルス効果を実現可能
- **設計への影響**: AdvancedMarker + カスタムHTML要素で青い丸マーカーを実装

## 設計判断

### 判断: 地図制御方式
- **背景**: 現在位置へ地図を移動する方法の選択
- **検討した代替案**:
  1. 制御モード（`center`/`zoom`プロップ）への切り替え — 常に状態と同期
  2. `useMap`フックによる命令的操作 — 必要時のみ実行
- **選択**: `useMap`フックによる命令的操作
- **理由**: 現在の非制御モードを維持でき、既存のピンチ・スワイプ操作に影響を与えない。制御モードにするとユーザーの自由な地図操作と競合する可能性がある
- **トレードオフ**: Reactの宣言的パターンから外れるが、地図操作はこの方式が自然

### 判断: Geolocation状態の管理場所
- **背景**: 位置情報の状態をどこで管理するか
- **検討した代替案**:
  1. MapPage（page.tsx）に直接記述
  2. カスタムフック`useGeolocation`に分離
- **選択**: カスタムフック`useGeolocation`
- **理由**: テスタビリティの向上、ロジックの分離、再利用可能性
- **トレードオフ**: ファイル数が増えるが、関心の分離によるメンテナンス性向上が勝る

## リスクと対策
- **リスク1**: ユーザーが位置情報を拒否した場合 → エラーメッセージ表示後、通常の地図表示を維持（グレースフルデグレーデーション）
- **リスク2**: 開発環境（localhost HTTP）ではGeolocation APIが制限される → Next.jsのdevサーバーでHTTPS設定、または実機テストはVercelプレビューで実施
- **リスク3**: 位置精度が低い環境での表示 → ズームレベルを適切に設定（精度に依存しない固定値）

## 参考資料
- @vis.gl/react-google-maps — useMapフック
- MDN — Geolocation API
- Google Maps JavaScript API — AdvancedMarker
