# Implementation Plan

- [x] 1. データ型の基盤整備
- [x] 1.1 Store型に新属性フィールドとprovenance管理型を追加する
  - `TernaryState`（yes / no / unknown）と `StoreAttributeKey` の型を定義する
  - `Store` インターフェースに `businessHours`・`floor`・`smoking`・`payments`・`hasRecording`・`hasStreaming` を任意フィールドとして追加する
  - `attributeSources` を `Partial<Record<StoreAttributeKey, Provenance>>` として追加し、既存の `countSources` と同一パターンで実装する
  - 既存フィールドを変更せず追加のみで後方互換を保つ
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 1.2 OverrideEntry型に新属性フィールドを追加する
  - `OverrideEntry` に `businessHours`・`floor`・`smoking`・`payments`・`hasRecording`・`hasStreaming` を任意フィールドとして追加する
  - 既存の `source` フィールドをそのまま再利用し、管理者確定値（admin）を示す
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. ライブラリ層の拡張
- [x] 2.1 (P) applyOverridesを拡張して新属性の適用とattributeSourcesの記録を追加する
  - 新属性キーの配列を定義し、ループで `OverrideEntry` から `Store` に各属性を適用する
  - 適用時に `attributeSources[key] = entry.source` を記録し、管理者由来か否かを追跡できるようにする
  - `OverrideEntry.updatedAt` を `Store.infoUpdatedAt` に反映する処理を追加する
  - 既存の `machineCounts`・`countSources`・`closed`・`delisted` の処理は変更しない
  - _Requirements: 5.2, 5.4, 6.1, 6.2, 6.3_

- [x] 2.2 (P) lib/report.tsに新モードの型定義とIssue整形関数を追加する
  - `FeedbackCategory`・`FeedbackInput`・`CorrectionType`・`StructuredStoreInput` の型を定義する
  - `buildFeedbackIssue()` を実装し、カテゴリ・内容・SNS ID 有無を含む Issue 本文を生成する
  - `buildStructuredStoreIssue()` を実装し、入力済みフィールドのみを「提案値一覧」テーブル形式で整形する
  - 全新モードで `neutralizeMentions` を適用し、@メンションと #Issue 参照を無効化する
  - SNS ID の提供有無に応じて「確定可能」/ 「未確認（みんなの報告）」を本文に明示する
  - 文字数上限の定数（content: 2000、reporter: 80、businessHours: 100 等）を定義する
  - `FEEDBACK_LABEL = 'アプリ要望'` 定数を定義する
  - _Requirements: 1.1, 1.2, 1.5, 1.8, 2.3, 2.5, 4.10_

- [x] 3. API層の拡張（POST /api/report）
- [x] 3.1 新モードのバリデーション関数を実装する
  - `validateFeedback()` を実装し、`content` 必須・文字数上限・category 有効値を検証する
  - `validateStructuredStore()` を実装し、全フィールド未入力の場合に 400 として拒否する
  - `machineCountsJojoLs`・`machineCountsGundamExvs` の整数チェック（0–99 範囲、NaN / Infinity 対策）を実装する
  - `payments` 配列の件数（max 20）と各要素の長さ（max 30 文字）をサーバー側で検証する
  - _Requirements: 1.4, 1.8, 2.4, 4.9_

- [x] 3.2 ルートハンドラに新モードのdispatch・Issue起票処理を追加する
  - honeypot チェック・環境変数チェックを共通処理として mode 不問で先行適用する
  - `mode === 'feedback'` → `validateFeedback` + `buildFeedbackIssue` + ラベル `アプリ要望` のパスを追加する
  - `mode === 'structured-store'` → `validateStructuredStore` + `buildStructuredStoreIssue` + ラベル `ユーザー報告` のパスを追加する
  - 既存の `mode === undefined` legacy パスを後方互換として維持する
  - 新モード識別のログプレフィックス `[report:structured-store]`・`[report:feedback]` を追加する
  - 正常時に `{ ok: true }` を返し、失敗時（400 / 503 / 502）は既存エラー応答形式を継承する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.5_

- [x] 4. アプリ要望フォーム（A機能）
- [x] 4.1 FeedbackFormコンポーネントを実装する
  - カテゴリ選択（新機能の提案・既存機能の改善・不具合・その他）・内容入力・SNS ID 入力欄（任意）を持つフォームを構築する
  - content が空の場合は送信前にクライアントバリデーションエラーを表示する
  - honeypot フィールドを非表示で組み込む
  - `mode=feedback` で `/api/report` へ POST し、送信完了（感謝）または失敗を状態に応じて表示する
  - ノンテック層にも分かる平易な日本語の文言で表示する
  - 認証なしで利用できる（ユーザー認証を要求しない）
  - `fixed inset-0 z-[60]` のオーバーレイで表示し、`onClose` で閉じる
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 1.6, 1.7, 7.2, 7.3_

- [x] 4.2 Onboarding.AboutPageのXインテントを廃止してFeedbackForm導線に差し替える
  - `INFO_REPORT_URL` 定数と「Xで報告する」リンクを削除する
  - アプリ要望フォームを開くボタンを配置し、`onOpenFeedback` prop で FeedbackForm を呼び出す
  - `OnboardingModal` → `Onboarding` 親で FeedbackForm の open 状態を管理する
  - _Requirements: 2.1_

- [ ] 5. 店舗詳細表示コンポーネント群（B機能）
- [ ] 5.1 StoreDetailPanelを実装する（全属性・provenance表示）
  - 全店舗属性（台数・営業時間・フロア・喫煙所・決済/電子マネー・録画台の有無・配信台の有無）を一覧表示する
  - 属性値が未登録（undefined）の場合は「未登録」と灰色テキストで表示する
  - `attributeSources[key] === 'user-report'` の属性には「（未確認）」を付与して未確認と分かる見た目で表示する
  - 既存の経路リンク・シェアボタン・おおよその位置注記・情報更新日（`infoUpdatedAt`）を移植して継承する
  - 「情報を提供」ボタンを配置し、`onOpenInfoForm` callback で StoreInfoForm へ誘導する
  - ノンテック層にも分かる平易な日本語の文言で表示する
  - _Requirements: 3.5, 3.6, 3.8, 5.3, 7.3_

- [ ] 5.2 StoreDetailModalを実装する（レスポンシブ詳細モーダル）
  - モバイル幅（md: 未満）ではボトムシート（画面下部から展開・`max-h-[85dvh]`・上部角丸）で表示する
  - PC幅（md: 以上）では画面中央のモーダル（`max-w-lg`・`rounded-2xl`）で表示する
  - `fixed inset-0 bg-black/40 z-[60]` のオーバーレイを設け、InfoWindow より前面に確実に配置する
  - `onClose` が呼ばれたときに地図に戻る
  - `onOpenInfoForm` を持ち、呼び出されると StoreInfoForm を開く口を提供する
  - StoreDetailPanel を内包し、store データを渡す
  - スマートフォン幅での操作性を最優先にしたレイアウトにする
  - _Requirements: 3.3, 3.4, 3.7, 7.4_

- [ ] 6. MapView・InfoWindowContentの拡張（B機能の統合）
- [ ] 6.1 InfoWindowContentを拡張してクイック表示から詳細展開できるようにする
  - `onReport` prop を削除し、代わりに `onOpenDetail: () => void` prop を追加する
  - 「詳細を見る」ボタンを追加し、タップで `onOpenDetail` を呼び出す
  - 店名・住所・台数・主要操作（経路・シェア）をクイック表示として維持する
  - _Requirements: 3.1, 3.2, 3.8_

- [ ] 6.2 MapViewを拡張してStoreDetailModalの状態管理を組み込む
  - `reportStore` state を `detailStore`（詳細モーダル用）と `infoFormStore`（情報提供フォーム用）の2つに分割する
  - `InfoWindowContent` の `onReport` 呼び出しを `onOpenDetail` に変更し、`detailStore` をセットする
  - `StoreDetailModal` を `detailStore` に基づいて表示し、`StoreDetailModal.onClose` で `detailStore` のみをクリアして地図に戻る
  - `StoreDetailModal.onOpenInfoForm` で `infoFormStore` をセットして StoreInfoForm を表示する
  - `StoreInfoForm.onClose` は `infoFormStore` のみをクリアし、`detailStore` を維持することで詳細モーダルに戻るようにする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

- [ ] 7. 構造化店舗情報提供フォーム（C機能）
- [ ] 7.1 StoreInfoFormを実装する（全属性一覧フォーム・ReportModal差し替え）
  - 全店舗属性（台数・営業時間・フロア・喫煙所・決済/電子マネー・録画台・配信台）を一覧表示する構造化フォームを構築する
  - 各属性に store の現在値を初期値として表示し、未登録の場合は空欄として明示する
  - `smoking`・`hasRecording`・`hasStreaming` は「— 未入力 — / あり / なし / 不明」の select で受け付ける
  - `payments` は固定選択肢のチェックボックス複数選択で受け付ける
  - フォーム下部に「修正・通報」セクション（位置ズレ・閉店/移設の種別選択＋テキストメモ）を配置する
  - SNS ID 入力欄（任意）と `noMention` チェックボックスをフォーム下部に配置する
  - honeypot フィールドを非表示で組み込む
  - 全フィールド未入力の場合はクライアントバリデーションでエラーを表示する
  - 入力済みフィールドのみを `mode=structured-store` で `/api/report` へ POST する（ランタイムでの直接書き込みは行わない）
  - 送信完了（感謝）または失敗を状態に応じて表示する
  - `fixed inset-0 z-[70]` で表示し、詳細モーダル（z-[60]）より前面に確実に配置する
  - ノンテック層にも分かる平易な日本語の文言で表示する
  - 認証なしで利用できる（ユーザー認証を要求しない）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 1.6, 1.7, 6.4, 7.1, 7.2, 7.3_

- [ ] 8. 廃止コンポーネントの除去・最終統合
- [ ] 8.1 ReportModalを削除して関連参照をクリーンアップする
  - `ReportModal.tsx` ファイルを削除する
  - `ReportModal` をインポート・使用しているすべての箇所を `StoreInfoForm` 経由の新フローに切り替える
  - `MapView.reportStore` state の残存参照をすべて除去する
  - `InfoWindowContent.onReport` prop の残存参照を除去する
  - _Requirements: 7.5_

- [ ] 8.2 既存機能の非回帰確認と統合動作検証を行う
  - ピンタップ → クイック表示（InfoWindow）→ 詳細モーダル（StoreDetailModal）→ 情報提供フォーム（StoreInfoForm）→ 送信完了 の一連のフローを確認する
  - オンボーディング → 要望フォーム（FeedbackForm）→ 送信完了 のフローを確認する
  - 地図表示・フィルタ・検索・クラスターが正常に動作することを確認する
  - モバイル幅（< 768px）でボトムシート、PC幅（≥ 768px）で中央モーダルになることを確認する
  - _Requirements: 7.4, 7.5_

- [ ]* 9.1 lib/report.tsの単体テストを追加する
  - `buildFeedbackIssue()` の各カテゴリ・SNS ID あり/なし・メンション中和をテストする
  - `buildStructuredStoreIssue()` の部分入力・全未入力・payments 配列整形をテストする
  - _Requirements: 1.2, 1.5, 2.5, 4.10_

- [ ]* 9.2 POST /api/reportの統合テストを追加する
  - `mode='feedback'` の honeypot 検知・必須欠落 400・正常系 200 をテストする
  - `mode='structured-store'` の honeypot 検知・全未入力 400・部分入力正常系をテストする
  - _Requirements: 1.3, 2.4, 4.9_

- [ ]* 9.3 applyOverrides拡張の単体テストを追加する
  - 新属性が Store に正しく適用されること・`attributeSources` が正しく記録されることをテストする
  - _Requirements: 5.2, 5.4, 6.3_
