import { createHash } from 'node:crypto'
import { normalizeTextBasics } from '@/lib/text-normalize'
import type { GameTitle, Store } from '@/types/store'
import type { MergedStore, RawStore, SiteKey } from './types'

/**
 * 店舗マージと住所正規化（Req2.3, 2.4, 2.6）。
 *
 * パイプラインの正確性（クロスサイトのマージ・決定論的ID・ジオコードキャッシュキー）は
 * `normalizeAddress` の決定論性に全面依存するため、仕様を明示し単体テストで固定する。
 *
 * - 正規化住所＋店舗名を統合キーとし、両サイトの同一店舗を1件へマージして `games` を合成する。
 * - 統合キーから決定論的ハッシュIDを採番し、再生成で同一住所→同一IDを保証する。
 * - 前回データに存在し直近スクレイプに無い店舗は、当該地域が正常取得できた場合のみ
 *   `delisted` を付与して保持し、取得失敗地域の店舗は前回状態を維持する（誤った一斉移設を防止）。
 */

// ---------------------------------------------------------------------------
// 住所正規化（統合キー生成・Req2.4）
// ---------------------------------------------------------------------------

/**
 * 各種ハイフン・ダッシュ・長音の文字クラス。
 * 半角 `-` / 全角 `－` / 長音 `ー` / マイナス `−` / 水平バー `―` / ダッシュ `–`/`—` / ハイフン `‐` を含む。
 */
const HYPHEN_LIKE = /[-－ー−―–—‐]/g

/**
 * 住所を統合キー用に正規化する純関数（Req2.4）。
 *
 * 1. 文字種統一（全角英数字→半角・全角空白→半角・連続/前後空白の除去）。
 * 2. 番地表記統一（`丁目`/`番地`/`番`/`号` と各種ハイフンを単一の `-` へ）。
 * 3. 建物名除去（番地レベルまでを住所コアとし、以降のビル名・階数を落とす）。
 *
 * 例: `東京都新宿区新宿3丁目22番12号 高層ビル5F` → `東京都新宿区新宿3-22-12`
 */
export function normalizeAddress(raw: string): string {
  let s = normalizeTextBasics(raw)

  // 番地表記をハイフンへ寄せる（`番地` を `番` より先に処理）
  s = s.replace(/丁目|番地|号|番/g, '-')
  s = s.replace(HYPHEN_LIKE, '-')

  // 番地ハイフン列の整理（番地内の空白除去・連続ハイフンの圧縮）
  s = s.replace(/(\d)\s+(?=[\d-])/g, '$1')
  s = s.replace(/-{2,}/g, '-')

  // 建物名除去: 先頭の非数字 + 最初の数字から続く数字・ハイフン列までを住所コアとする
  const core = s.match(/^(\D*\d[\d-]*)/)
  if (core) s = core[1]

  // 末尾ハイフンの除去
  return s.replace(/-+$/g, '').trim()
}

// ---------------------------------------------------------------------------
// 決定論的ID採番（Req2.4）
// ---------------------------------------------------------------------------

/**
 * 統合キーから決定論的なハッシュIDを導出する。
 * 同一キー→同一ID・再生成で安定。衝突回避のため店舗名を含めた統合キーを渡す。
 */
export function deriveId(key: string): string {
  return createHash('sha1').update(key).digest('hex').slice(0, 12)
}

// ---------------------------------------------------------------------------
// マージ（Req2.3, 2.4, 2.6）
// ---------------------------------------------------------------------------

/** サイト識別子→ゲームタイトル */
const SITE_TO_GAME: Record<SiteKey, GameTitle> = {
  jojols: 'jojo-ls',
  gundam: 'gundam-exvs',
}

/** ゲームの正準順序（出力の決定論性のため） */
const GAME_ORDER: GameTitle[] = ['jojo-ls', 'gundam-exvs']

/** 店舗名を統合キー用に正規化（前処理＋全空白除去でサイト間の表記揺れを吸収） */
function normalizeName(raw: string): string {
  return normalizeTextBasics(raw).replace(/\s+/g, '')
}

/** 正規化住所＋正規化店舗名から統合キーを生成（同一番地の別店舗を区別する） */
function buildMergeKey(normalizedAddress: string, name: string): string {
  return `${normalizedAddress}|${normalizeName(name)}`
}

/** ゲーム集合を正準順序の非空タプルへ整える */
function canonicalGames(games: Iterable<GameTitle>): [GameTitle, ...GameTitle[]] {
  const set = new Set(games)
  const ordered = GAME_ORDER.filter((g) => set.has(g))
  return ordered as [GameTitle, ...GameTitle[]]
}

export interface MergeInput {
  /** 今回スクレイプで正常取得できた店舗（両サイト混在・未マージ） */
  raw: RawStore[]
  /** 前回 `stores.json` の店舗（移設判定・closed/座標の引き継ぎ基準） */
  prev: Store[]
  /** 今回正常取得できた地域コードの集合（移設判定の適用範囲） */
  scrapedAreas: Set<string>
}

/**
 * 両サイトの店舗を正規化住所キーでマージし、ゲーム合成・移設判定・ID採番を行う。
 */
export function mergeStores(input: MergeInput): MergedStore[] {
  const { raw, prev, scrapedAreas } = input

  // 前回店舗を統合キーで索引（closed/座標の引き継ぎと存在判定に使用）
  const prevByKey = new Map<string, Store>()
  for (const p of prev) {
    prevByKey.set(buildMergeKey(normalizeAddress(p.address), p.name), p)
  }

  // 今回スクレイプ分を統合キーで集約
  const merged = new Map<string, MergedStore>()
  for (const r of raw) {
    const normalizedAddress = normalizeAddress(r.address)
    const key = buildMergeKey(normalizedAddress, r.name)
    const game = SITE_TO_GAME[r.site]

    const existing = merged.get(key)
    if (existing) {
      existing.games = canonicalGames([...existing.games, game])
      continue
    }

    const prevMatch = prevByKey.get(key)
    merged.set(key, {
      id: deriveId(key),
      name: r.name,
      address: r.address,
      normalizedAddress,
      games: canonicalGames([game]),
      area: r.area,
      // closed（手動）は本パイプラインで変更せず前回値を維持する
      ...(prevMatch?.closed ? { closed: true } : {}),
      // 今回も掲載されているため delisted は付与しない（移設フラグの解除）
      // 既ジオコード済みの座標は再問い合わせ回避のため引き継ぐ
      ...(prevMatch?.lat !== undefined && prevMatch.lng !== undefined
        ? { lat: prevMatch.lat, lng: prevMatch.lng }
        : {}),
    })
  }

  const result: MergedStore[] = [...merged.values()]

  // 前回存在し今回スクレイプに無い店舗の扱い（移設判定 / 前回状態維持）
  for (const p of prev) {
    const normalizedAddress = normalizeAddress(p.address)
    const key = buildMergeKey(normalizedAddress, p.name)
    if (merged.has(key)) continue // 今回も掲載 → マージ済み

    const area = prefectureToArea(p.address)
    const areaScraped = area !== null && scrapedAreas.has(area)

    result.push({
      id: deriveId(key),
      name: p.name,
      address: p.address,
      normalizedAddress,
      games: canonicalGames(p.games),
      area: area ?? '',
      ...(p.closed ? { closed: true } : {}),
      // 正常取得エリアでの消失→移設判定。取得失敗エリアは前回の delisted 状態を維持。
      ...(areaScraped || p.delisted ? { delisted: true } : {}),
      ...(p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : {}),
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// 都道府県→地域コード（前回店舗の area 判定・Req2.6）
// ---------------------------------------------------------------------------

/** ISO 3166-2:JP の都道府県順（JP-01〜JP-47） */
const PREFECTURES: string[] = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
]

const PREFECTURE_TO_AREA: Map<string, string> = new Map(
  PREFECTURES.map((pref, i) => [pref, `JP-${i + 1 < 10 ? `0${i + 1}` : `${i + 1}`}`]),
)

/**
 * 住所先頭の都道府県名から地域コード（JP-XX）を導出する。
 * `Store` は `area` を持たないため、移設判定の際は前回店舗の住所から地域を復元する。
 */
export function prefectureToArea(address: string): string | null {
  const normalized = normalizeTextBasics(address)
  for (const [pref, code] of PREFECTURE_TO_AREA) {
    if (normalized.startsWith(pref)) return code
  }
  return null
}
