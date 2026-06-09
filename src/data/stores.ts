import type { Store } from '@/types/store'
import type { StoresFile, StoresMeta } from '@/types/stores-file'
import type { OverridesFile } from '@/types/overrides'
import { applyOverrides } from '@/lib/apply-overrides'
import storesFile from './stores.json'
import overridesFile from './overrides.json'

/**
 * 生成物 `stores.json` を読み込み型付けして re-export する薄いローダ。
 *
 * - データはビルド前パイプラインが生成し、アプリ側は read-only で参照する（書き込みなし）。
 * - 公式データに手動オーバーライド（`overrides.json`）をランタイムで重ねる。
 *   毎ビルド再適用されるため、毎週のスクレイプに上書きされず修正が保持される。
 * - 型は生成器と二重定義せず、共有の {@link Store} / {@link StoresMeta} を再利用する。
 * - ビルド時にバンドルされ CDN エッジ配信される静的データ構成を維持する。
 * - 既存の `import { stores } from '@/data/stores'` 互換を維持する。
 */
const data = storesFile as StoresFile

/** 設置店舗一覧（公式データ＋手動オーバーライド適用済み・read-only） */
export const stores: Store[] = applyOverrides(data.stores, overridesFile as OverridesFile)

/** データメタ情報（最終更新日時・出典） */
export const storesMeta: StoresMeta = {
  lastUpdated: data.lastUpdated,
  source: data.source,
}
