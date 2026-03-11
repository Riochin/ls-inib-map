# リサーチ & 設計判断ログ

## サマリー
- **フィーチャー**: `arcade-store-map`
- **ディスカバリースコープ**: 新規フィーチャー（グリーンフィールド）
- **主要な発見**:
  - `@vis.gl/react-google-maps`がGoogle公式推奨のReact地図ライブラリ（OpenJS Foundation管理）
  - AdvancedMarker + InfoWindowパターンでマーカータップ→情報表示を実現可能
  - Next.js App Routerではクライアントコンポーネント指定（`'use client'`）が必須

## リサーチログ

### React向けGoogle Mapsライブラリの選定
- **背景**: 要件1〜3の地図表示・マーカー・フィルタリングに最適なライブラリを調査
- **調査ソース**:
  - [Google Maps公式ドキュメント](https://developers.google.com/maps/documentation/javascript/examples/rgm-basic-map)
  - [@vis.gl/react-google-maps npm](https://www.npmjs.com/package/@vis.gl/react-google-maps)
  - [@vis.gl/react-google-maps GitHub](https://github.com/visgl/react-google-maps)
  - [visgl/react-google-maps vs @react-google-maps/api 比較](https://github.com/visgl/react-google-maps/discussions/163)
- **発見**:
  - `@vis.gl/react-google-maps` v1.7.1: Google公式推奨、OpenJS Foundation管理、TypeScriptファーストクラス
  - `@react-google-maps/api`: 個人メンテナ、メンテナンス頻度低下傾向
  - AdvancedMarkerコンポーネント内蔵、InfoWindowとの連携も`useAdvancedMarkerRef`フックで簡潔に実装可能
- **影響**: `@vis.gl/react-google-maps`を採用。長期サポートとTypeScript対応の観点で優位

### Next.js App Router + Google Maps統合パターン
- **背景**: SSRデフォルトのApp Routerで地図ライブラリを適切に統合する方法
- **調査ソース**:
  - [Next.js Third Party Libraries](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries)
  - [react-google-maps公式ドキュメント](https://visgl.github.io/react-google-maps/)
- **発見**:
  - 地図コンポーネントは`'use client'`ディレクティブが必須
  - `APIProvider`でAPIキーを一元管理し、アプリ全体またはルートグループのレイアウトでラップ
  - 環境変数`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`でクライアントサイドにAPIキーを公開
  - `defaultCenter`/`defaultZoom`で非制御モード使用がMVPには適切
- **影響**: レイアウトレベルでAPIProviderを配置するシンプルなアーキテクチャを採用

### AdvancedMarker + InfoWindowパターン
- **背景**: マーカータップで店舗情報を表示する要件2の実装方式
- **調査ソース**:
  - [AdvancedMarkerドキュメント](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker)
  - [InfoWindowドキュメント](https://visgl.github.io/react-google-maps/docs/api-reference/components/info-window)
- **発見**:
  - `useAdvancedMarkerRef`フックでマーカーとInfoWindowを接続
  - Pinコンポーネントでマーカーの色カスタマイズが可能（タイトル別色分けに使用）
  - InfoWindowの`onClose`イベントで状態同期が必要
  - refコールバックのメモ化が重要（レンダリングループ回避）
- **影響**: AdvancedMarker + Pin + InfoWindowの組み合わせで要件2・3を実現

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制限 | 備考 |
|-----------|------|------|------------|------|
| 単一ページCSR | 1ページのクライアントサイドアプリ | 最もシンプル、実装速度最速 | SEO制限（MVPでは問題なし） | ユーザー15名のMVPに最適 |
| SSG + クライアントハイドレーション | 静的生成 + クライアントで地図初期化 | 初回ロード高速、SEO可能 | やや複雑 | 将来のスケール時に検討 |

## 設計判断

### 判断: 地図ライブラリの選定
- **背景**: React/Next.jsでGoogle Mapsを統合するライブラリの選定
- **検討した代替案**:
  1. `@vis.gl/react-google-maps` — Google公式推奨、OpenJS Foundation管理
  2. `@react-google-maps/api` — 長い実績があるが個人メンテナ
  3. `@googlemaps/react-wrapper` — 低レベルラッパー
- **選択**: `@vis.gl/react-google-maps`
- **理由**: Google公式推奨、TypeScriptファーストクラス、AdvancedMarker内蔵、活発なメンテナンス
- **トレードオフ**: コミュニティの情報量は`@react-google-maps/api`がやや多いが、公式サポートの安定性を優先
- **フォローアップ**: Google Maps APIキーの取得とMap IDの設定が必要

### 判断: データ管理方式
- **背景**: 設置店舗データの格納・提供方式
- **検討した代替案**:
  1. TypeScriptファイル（型付き配列） — ビルド時バンドル、型安全
  2. JSONファイル — 汎用性が高いが型検証が別途必要
  3. CMS/API — 動的更新可能だが過剰
- **選択**: TypeScriptファイル
- **理由**: 型安全性が保証され、IDE補完が効く。データ量が少なく静的更新で十分
- **トレードオフ**: データ更新にはコード変更とデプロイが必要だが、15名規模のMVPでは許容範囲

## リスク & 軽減策
- **Google Maps APIキーの管理** — `NEXT_PUBLIC_`プレフィックスでクライアント公開が必要。APIキー制限（HTTPリファラ制限）で軽減
- **店舗データの鮮度** — 公式サイトの情報変更に追従が必要。手動更新で対応（MVP段階）
- **AdvancedMarker使用にMap IDが必要** — Google Cloud Consoleでの設定が必要。セットアップ手順をタスクに含める

## 参考文献
- [react-google-maps公式ドキュメント](https://visgl.github.io/react-google-maps/) — メインAPIリファレンス
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) — 基盤API
- [Next.js App Router](https://nextjs.org/docs/app) — フレームワーク基盤
- [@vis.gl/react-google-maps npm](https://www.npmjs.com/package/@vis.gl/react-google-maps) — パッケージ情報
