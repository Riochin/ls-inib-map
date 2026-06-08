import type { Store } from '@/types/store'
import type { StoresFile, StoresMeta } from '@/types/stores-file'
import storesFile from './stores.json'

/**
 * 生成物 `stores.json` を読み込み型付けして re-export する薄いローダ。
 *
 * - データはビルド前パイプラインが生成し、アプリ側は read-only で参照する（書き込みなし）。
 * - 型は生成器と二重定義せず、共有の {@link Store} / {@link StoresMeta} を再利用する。
 * - ビルド時にバンドルされ CDN エッジ配信される静的データ構成を維持する。
 * - 既存の `import { stores } from '@/data/stores'` 互換を維持する。
 */
const data = storesFile as StoresFile

/** 設置店舗一覧（read-only） */
export const stores: Store[] = data.stores

/** データメタ情報（最終更新日時・出典・任意の公式総数） */
export const storesMeta: StoresMeta = {
  lastUpdated: data.lastUpdated,
  source: data.source,
  ...(data.officialTotals ? { officialTotals: data.officialTotals } : {}),
}
