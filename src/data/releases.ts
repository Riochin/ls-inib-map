/**
 * リリースノート＝サイト内「お知らせ」の単一の出どころ。
 *
 * - 先頭 `releases[0]`（= {@link latestRelease}）が最新で、新機能ページの主役。
 *   再訪ユーザーへ自動表示する版もこのバージョンで決まる（Onboarding の NEWS_VERSION）。
 * - 全件が新機能ページの「これまでのアップデート」一覧に新しい順で並ぶ。
 *
 * 新リリース時は、先頭にこのバージョンのエントリを足すだけ。
 * 文面の下書きは `updates/v<N.N>/news.md`（Release announcement ワークフローが自動生成）を
 * 清書してここへ転記する。これがサイト反映の唯一の作業になる。
 */

export interface ReleaseHighlight {
  /** 機能名（短く） */
  title: string
  /** 説明（1〜2文・ノンテック層にやさしい言葉で） */
  body: string
}

export interface Release {
  /** バージョン番号 'N.N' */
  version: string
  /** 公開日 'YYYY-MM-DD'（不明な過去版は省略可） */
  date?: string
  /**
   * 新機能ページのキャッチコピー。`accent` を紫で強調表示する。
   * 例: { lead: 'その台数、', accent: '「信じていい？」', tail: 'がわかる。' }
   */
  headline: { lead?: string; accent: string; tail?: string }
  /** 目玉機能（上から順に表示） */
  highlights: ReleaseHighlight[]
}

/** 新しい順。先頭が最新。 */
export const releases: Release[] = [
  {
    version: '2.3',
    date: '2026-06-18',
    headline: { lead: 'あなたの情報が、', accent: '地図になる', tail: '。' },
    highlights: [
      {
        title: '店舗詳細モーダル',
        body: '店舗ピンをタップ後、「詳細を見る」で営業時間・録画台・配信台・決済手段なども確認できるようになりました。',
      },
      {
        title: '情報提供フォームのリニューアル',
        body: '台数だけでなく、営業時間・録画台・配信台・決済手段など6種の属性をまとめて提供できるフォームに生まれ変わりました。',
      },
      {
        title: 'アプリ要望フォーム',
        body: '機能の改善提案や不具合を、アプリ内から直接送れるようになりました。',
      },
    ],
  },
  {
    version: '2.2',
    date: '2026-06-10',
    headline: { lead: 'もっと', accent: '「正しい場所」', tail: 'に。' },
    highlights: [
      {
        title: 'マップから情報提供',
        body: 'サイト内から直接、台数や場所のまちがいを報告できるようになりました。気づいたら、その場でひと言送るだけでOKです。',
      },
      {
        title: '「おおよその位置」表示',
        body: '住所だけでは正確に置けないピンに、薄い円で「だいたいこの辺り」と正直に示すようにしました。あやしいピンが一目で分かります。',
      },
      {
        title: '情報の更新日を表示',
        body: '店舗ごとに「情報更新：日付」を表示。いつ時点の情報なのかが分かるようになりました。',
      },
    ],
  },
  {
    version: '2.1',
    headline: { lead: 'その台数、', accent: '「信じていい？」', tail: 'がわかる。' },
    highlights: [
      {
        title: '台数の出どころ表示',
        body: '台数バッジの色の濃さで「確からしさ」がひと目で分かるように。タップすると、その台数の出どころ（公式サイト・現地での確認など）も見られます。',
      },
      {
        title: 'ペア戦カレンダー',
        body: 'ラスサバの対戦モード（ペア戦／個人戦）を地図のチップと月間カレンダーで確認できるようになりました。',
      },
    ],
  },
  {
    version: '2.0',
    headline: { lead: 'ついに', accent: '全国', tail: '対応。' },
    highlights: [
      {
        title: '全国の設置店舗に対応',
        body: '関東260店から、全国761店へ拡大しました。日本全国のラスサバ・イニブ設置店を地図でまとめて確認できます。',
      },
    ],
  },
]

/** 最新リリース（新機能ページの主役）。 */
export const latestRelease = releases[0]
