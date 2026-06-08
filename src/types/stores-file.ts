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
}

/**
 * 生成物 `stores.json` のルート型。
 * メタ情報（{@link StoresMeta}）＋既存の {@link Store} 配列で構成し、
 * 生成器とローダで型を二重定義しない（Store / StoresMeta を再利用）。
 */
export interface StoresFile extends StoresMeta {
  stores: Store[]
}
