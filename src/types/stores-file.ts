import type { Store } from '@/types/store'

/**
 * 生成物 `stores.json` のメタ情報。
 * データ更新パイプライン（生成器）が埋め込み、クライアントのローダが read-only で公開する。
 */
export interface StoresMeta {
  /** 最終更新日時（ISO 8601・生成時刻） */
  lastUpdated: string
  /** データ出典URL（公式2サイト） */
  source: {
    jojols: string
    gundam: string
  }
  /**
   * 都道府県別の最終更新日時（任意・ISO 8601）。キーは都道府県の正式名（例「東京都」）。
   * 生成器が「その県の店舗集合に実体差分があった生成回」の `lastUpdated` を記録し、差分の無い県は
   * 前回値を引き継ぐ。サイトマップの県ページ `lastmod` の根拠（全県一律の `lastUpdated` を
   * 使うと実際には変わっていないページまで更新扱いになり、検索エンジンが lastmod を信用しなくなる）。
   * 旧生成物には存在しないため任意。
   */
  prefectureUpdatedAt?: Record<string, string>
}

/**
 * 生成物 `stores.json` のルート型。
 * メタ情報（{@link StoresMeta}）＋既存の {@link Store} 配列で構成し、
 * 生成器とローダで型を二重定義しない（Store / StoresMeta を再利用）。
 */
export interface StoresFile extends StoresMeta {
  stores: Store[]
}
