# Research & Design Decisions

---
**Purpose**: store-info-contribution（ver2.3）設計フェーズの調査ログと設計判断の根拠を記録する。

---

## Summary

- **Feature**: `store-info-contribution`
- **Discovery Scope**: Extension（既存投稿パイプライン・InfoWindow・Onboarding の拡張）
- **Key Findings**:
  - `/api/report` + `buildReportIssue` は honeypot・メンション無害化・GitHub API 呼び出しを既にカバーしており、新モード（structured-store / feedback）を discriminated union として追加するだけで共通基盤を再利用できる。
  - `Store` 型に新属性（businessHours, floor, smoking, payments, hasRecording, hasStreaming）と `attributeSources` を追加するだけでよく、`applyOverrides` の既存パターンを踏襲すれば管理者反映層との整合が取れる。
  - モバイル最優先の Tailwind CSS `md:` ブレークポイントで Bottom Sheet / 中央モーダルを CSS-only で切り替えられるため、JS breakpoint detection の追加ライブラリは不要。

---

## Research Log

### 既存投稿パイプラインの構造分析

- **Context**: 新 3 機能を「共通パイプライン」として統合できるか確認。
- **Sources Consulted**: `src/app/api/report/route.ts`, `src/lib/report.ts`
- **Findings**:
  - `POST /api/report` は以下を順に実行: honeypot 判定 → バリデーション → env check → GitHub API call
  - `buildReportIssue(ReportInput)` が Issue タイトル・本文を生成する。storeId/storeName/storeAddress/type/text を必須とする。
  - ラベルは `REPORT_LABEL = 'ユーザー報告'` の固定値。
  - `mode` フィールドによる dispatch 拡張でアプリ要望（`アプリ要望` ラベル）と構造化提供（既存ラベル継承）を同一ルートで処理できる。
- **Implications**: API ルートに `mode` 分岐を追加し、モード別バリデーター（`validateStructuredStore`, `validateFeedback`）と Issue ビルダー（`buildStructuredStoreIssue`, `buildFeedbackIssue`）を `lib/report.ts` に追加する。既存の honeypot・env check・GitHub API 送信は共通処理として維持する。

### 既存 Store 型と provenance パターンの分析

- **Context**: 新店舗属性と属性別 provenance をどのように Store 型に統合するか確認。
- **Sources Consulted**: `src/types/store.ts`, `src/types/overrides.ts`, `src/lib/apply-overrides.ts`
- **Findings**:
  - `machineCounts?: Partial<Record<GameTitle, number>>` と `countSources?: Partial<Record<GameTitle, Provenance>>` が台数の provenance 管理の先行実装。
  - `applyOverrides` は `OverrideEntry.machineCounts` を `Store.machineCounts` へコピーし、`Store.countSources[game] = entry.source` を記録するパターン。
  - `Provenance = 'official' | 'auto-scrape' | 'user-report' | 'admin'` が既に定義済みで再利用可能。
  - `OverrideEntry` に新属性を追加し `applyOverrides` で `attributeSources[key] = entry.source` を記録する実装が自然な拡張。
- **Implications**: `Store` に `attributeSources?: Partial<Record<StoreAttributeKey, Provenance>>` を追加し、`OverrideEntry` に同じ新属性フィールドを追加する。`applyOverrides` は新フィールドを適用する分岐を追加するだけでよい。

### 現在の InfoWindow / ReportModal の構造分析

- **Context**: クイック表示維持・詳細拡大の実装方法を検討。
- **Sources Consulted**: `src/components/MapView.tsx`, `src/components/ReportModal.tsx`
- **Findings**:
  - `MapView` は `openStoreId` state で `InfoWindow` を管理し、`reportStore` state で `ReportModal` を管理する、2段階のモーダル連鎖パターン。
  - `InfoWindowContent` は `MapView` 内の内部コンポーネントとして定義されており、`onReport` callback で `ReportModal` を開く。
  - `ReportModal` は `fixed inset-0 z-[60]` の中央モーダル。
  - `InfoWindow` は Google Maps が独自に DOM に描画する（ピン位置に紐付く）ため、クイック表示として維持し、詳細は別 DOM レイヤ（fixed overlay）で重ねるのが適切。
- **Implications**: `MapView` に `detailStore: Store | null` state を追加し、`InfoWindowContent` の `onOpenDetail` で開く。`StoreDetailModal` は `ReportModal` と同じ fixed overlay レイヤに配置する。クイック表示（InfoWindow）は維持。

### Onboarding コンポーネントの「店舗情報の修正・提供」セクション

- **Context**: 廃止するX投稿インテントの場所と差し替え方法を確認。
- **Sources Consulted**: `src/components/Onboarding.tsx`
- **Findings**:
  - `AboutPage` 関数コンポーネント内の `<div>` で `INFO_REPORT_URL`（X投稿インテント URL）を `<a>` タグで表示している（283〜296行目付近）。
  - 「店舗情報の修正・提供」セクションの `<dd>` 内に「Xで報告する」リンクボタン + 説明文がある。
  - `INFO_REPORT_URL` / `info_report_url` 定数と関連 `<a>` タグを削除し、代わりに `FeedbackForm` を開く button を設置する。
  - `OnboardingModal` 内での modal-in-modal（FeedbackForm が別オーバーレイ）が安全。
- **Implications**: `AboutPage` に `onOpenFeedback` prop を追加し、「アプリへの要望を送る」ボタンで `FeedbackForm` を開く。`FeedbackForm` は `ReportModal` 同様の独立オーバーレイ（`fixed inset-0 z-[60]`）。

### レスポンシブ Bottom Sheet vs 中央モーダル の実装方法

- **Context**: モバイル=ボトムシート / PC=中央モーダルの切り替えをどう実装するか。
- **Sources Consulted**: Tailwind CSS docs (breakpoints), Onboarding.tsx (既存モーダルパターン)
- **Findings**:
  - Tailwind CSS の `md:` ブレークポイント（デフォルト 768px）で CSS-only の条件分岐が可能。
  - ボトムシート: `fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh] overflow-y-auto` でスマホ向けを表現できる。
  - 中央モーダル: `md:inset-0 md:flex md:items-center md:justify-center` で PC 向けに切り替え。
  - JS での breakpoint 検知（useWindowSize 等）は不要。既存の ReportModal が `items-center justify-center` の中央モーダルパターンを採用しており、`max-w-sm` で幅制限している。
  - ボトムシートのスワイプダウン（drag to close）は touch event 処理が複雑になるため、本 spec のスコープ外とし「×ボタンまたはオーバーレイタップで閉じる」で統一する。
- **Implications**: `StoreDetailModal` は単一コンポーネントで CSS クラスのみでレスポンシブを実現する。モバイルは下から展開・角丸上部、PC は中央モーダル。スワイプ close は非スコープ。

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 単一 `/api/report` 拡張（mode discriminant） | `mode` フィールドで既存ルートに新モードを追加 | 共通基盤（honeypot・env・GitHub call）を共有できる。エンドポイントの増加なし | ルートが複雑化する | 要件「共通投稿パイプライン」と整合。採用。 |
| B: 新エンドポイント `/api/feedback` を追加 | アプリ要望専用ルートを別途追加 | 責務が明確 | 共通処理の重複。honeypot・env check を二重実装する必要 | Req 1.1「一元化」と若干ずれる。不採用。 |
| C: CSS-only レスポンシブ Bottom Sheet | Tailwind `md:` ブレークポイントで切り替え | 追加ライブラリ不要・既存スタイルパターン継承 | 768px 境界が正確でない端末で意図と異なる可能性 | ターゲット（スマホ / PC）の境界として十分。採用。 |
| D: JS breakpoint detection | `useWindowSize` hook で動的に切り替え | 正確な画面幅チェック | コード追加・SSR での初期値問題 | オーバーエンジニアリング。不採用。 |

---

## Design Decisions

### Decision: `/api/report` への mode discriminant 拡張

- **Context**: 3種類の投稿（構造化店舗情報・アプリ要望・既存レポート）を同一パイプラインで処理する
- **Alternatives Considered**:
  1. 単一ルート拡張（mode フィールド）— バリデーター・ビルダーをモード別に分ける
  2. 別エンドポイント（/api/feedback）— 共通処理を重複実装
- **Selected Approach**: `mode: 'structured-store' | 'feedback'` フィールドを受け付け、ルート内でバリデーションと Issue ビルダーを dispatch する。既存の undefined/legacy mode は既存 `validateReport` + `buildReportIssue` に fallback しない（新フォームは必ず mode 指定）。
- **Rationale**: Req 1.1「一元化」との整合。honeypot・env check・GitHub API call の共有。
- **Trade-offs**: route.ts が少し長くなるが、各モードのバリデーター関数を lib/report.ts に分離することで可読性を維持できる。
- **Follow-up**: 実装時に既存テスト（`src/__tests__/report-route.test.ts`）に新モードのケースを追加する。

### Decision: `attributeSources` の Partial Record パターン採用

- **Context**: 各店舗属性の provenance を個別に管理する
- **Alternatives Considered**:
  1. `Partial<Record<StoreAttributeKey, Provenance>>` — 既存 `countSources` と同一パターン
  2. 属性ごとに `smokingSource?: Provenance` 等の個別フィールド — 型は明示的だがフィールド数が倍増
- **Selected Approach**: Option 1（Partial Record パターン）を採用し、`countSources` との一貫性を維持する。
- **Rationale**: 既存 `applyOverrides` のループ処理と整合し、表示側も `attributeSources?.[key]` で統一的にアクセスできる。
- **Trade-offs**: StoreAttributeKey の型定義が必要だが、これは `types/store.ts` で一元管理できる。

### Decision: ボトムシートの CSS-only レスポンシブ実装

- **Context**: モバイル=ボトムシート / PC=中央モーダルの切り替え
- **Alternatives Considered**:
  1. Tailwind `md:` ブレークポイントによる CSS-only 切り替え
  2. JS `useWindowSize` hook による動的切り替え
- **Selected Approach**: CSS-only。モバイル: `fixed bottom-0 inset-x-0 rounded-t-2xl`、PC: `md:inset-0 md:flex md:items-center md:justify-center`。
- **Rationale**: 追加ライブラリ不要、SSR 安全、Tailwind の既存パターンと整合。
- **Trade-offs**: 768px 境界が粗いが、ターゲットユーザー（スマホ or PC）の判別として十分。

---

## Risks & Mitigations

- **モーダル z-index の競合**: InfoWindow（Google Maps 内部 DOM）と StoreDetailModal（fixed overlay）が重なる可能性 — StoreDetailModal は `z-[60]`（ReportModal と同値）で確実に最前面に。
- **payments 配列の入力爆発**: ユーザーが大量の決済手段を選択した場合の Issue 本文肥大化 — 選択肢は固定リストから複数選択とし、サーバー側で配列長上限（20件）を検証する。
- **全未入力 bypass**: StoreInfoForm でクライアントバリデーションをすり抜けた場合 — サーバー側でも「少なくとも1フィールドに値がある」チェックを実施（Req 4.9）。
- **applyOverrides の後方互換**: 新属性が既存 overrides.json に存在しない場合 — 全フィールドが `undefined` のため、既存の `?.` アクセスパターンで問題なし。

---

## References

- [Google Maps InfoWindow API](https://developers.google.com/maps/documentation/javascript/infowindows) — InfoWindow のライフサイクルとカスタム DOM 配置
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) — `md:` ブレークポイントの挙動確認
- [GitHub Issues REST API](https://docs.github.com/en/rest/issues/issues#create-an-issue) — `labels` フィールドで Issue ラベルを指定する方法
