import type { GameTitle } from '@/types/store'

/**
 * サイト共通の設定・文言の単一ソース。
 *
 * オンボーディングモーダル（{@link ../components/Onboarding}）と `/about` ページで共有し、
 * 開発者情報・SNS・データ方針・免責などの「事実」を二重管理しないための置き場。
 * プレーンな定数・文字列のみ（'use client' / 'use server' 非依存）で、サーバー
 * コンポーネント（/about）からもクライアントコンポーネント（モーダル）からも import できる。
 */

/** タイトルの正式名称・通称・別名（指名検索の被リンク面を広げるための単一ソース）。 */
export interface GameNameInfo {
  /** 通称（UI で主に使う短縮名）。 */
  short: string
  /** 正式名称。 */
  full: string
  /** 別名・英語表記・よくある検索表記（重複なし）。 */
  aliases: string[]
}

/**
 * 対応タイトルの名称表。正式名は layout.tsx / SeoContent.tsx の表記と揃える。
 * 別名は「実際に検索されうる正しい表記」のみを入れる（誤った別名で誤誘導しない）。
 */
export const GAME_NAMES: Record<GameTitle, GameNameInfo> = {
  'gundam-exvs': {
    short: 'イニブ',
    full: '機動戦士ガンダム EXTREME VS.2 INFINITEBOOST',
    aliases: ['ガンダム EXVS2', 'エクバ2', 'EXVS2', 'INFINITE BOOST'],
  },
  'jojo-ls': {
    short: 'ラスサバ',
    full: 'ジョジョの奇妙な冒険 ラストサバイバー',
    aliases: ['ラストサバイバー', 'ジョジョ ラスサバ', 'JOJO ラストサバイバー'],
  },
}

/** 「正式名称（通称）」の表記を返すヘルパー（例: ○○○（イニブ））。 */
export function gameFullWithShort(game: GameTitle): string {
  const n = GAME_NAMES[game]
  return `${n.full}（${n.short}）`
}

/** 開発者の表示名。 */
export const AUTHOR_NAME = 'マルハット'
/** 開発者の X ハンドル（@なし）。 */
export const X_HANDLE = 'ls_boushi'
/** 開発者の X プロフィール URL。 */
export const X_URL = `https://x.com/${X_HANDLE}`

/**
 * X 共有インテント用のサイト URL（カスタムドメイン）。
 * ※ SEO の canonical 原点（`https://ls-inib-map.vercel.app`）とは別物。共有時の表示用。
 */
export const SHARE_SITE_URL = 'https://lsib.world/'

/** 投稿推奨ハッシュタグ（#なし）。 */
export const TWEET_HASHTAG = 'ラストサバイニブ'
/** 共有インテントの本文。 */
const TWEET_TEXT = 'ラスサバ・イニブの設置店舗マップ📍'
/** ハッシュタグ検索 URL。 */
export const HASHTAG_URL = `https://x.com/hashtag/${encodeURIComponent(TWEET_HASHTAG)}`
/** X 投稿インテント URL（本文・URL・ハッシュタグをプリフィル）。 */
export const SHARE_URL =
  'https://x.com/intent/post' +
  `?text=${encodeURIComponent(TWEET_TEXT)}` +
  `&url=${encodeURIComponent(SHARE_SITE_URL)}` +
  `&hashtags=${encodeURIComponent(TWEET_HASHTAG)}`

/** アプリの一文紹介（モーダル・/about 共有）。 */
export const APP_INTRO =
  'ラスサバ・イニブの設置店舗を地図でまとめて確認できる非公式の個人開発アプリです。'

/** データ方針の基本説明（反映タイムラグ・店舗確認の注意。モーダル・/about 共有）。 */
export const DATA_BASIC =
  '店舗データは各公式サイトをもとに自動更新しています。反映までに時間差があり、最新の状況と異なる場合があります。実際の稼働状況は店舗へご確認ください。'

/** プライバシー説明（モーダル・/about 共有）。 */
export const PRIVACY_NOTE =
  '現在地はブラウザ内で地図表示にのみ使用し、サーバーへ送信・保存することはありません。'

/** 免責（モーダル・/about 共有）。 */
export const DISCLAIMER =
  '本アプリはファン制作の非公式サービスであり、株式会社バンダイナムコアミューズメント等の権利者とは一切関係ありません。'
