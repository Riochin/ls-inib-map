import { describe, it, expect, expectTypeOf } from 'vitest'
import type { StoresMeta, StoresFile } from '@/types/stores-file'
import type { Store } from '@/types/store'

describe('StoresMeta / StoresFile 型', () => {
  it('StoresMeta は lastUpdated・source を必須で持つ', () => {
    const meta: StoresMeta = {
      lastUpdated: '2026-06-08T00:00:00.000Z',
      source: { jojols: 'https://example.com/jojo', gundam: 'https://example.com/gundam' },
    }
    expect(meta.lastUpdated).toBe('2026-06-08T00:00:00.000Z')
    expect(meta.source.jojols).toContain('https://')
  })

  it('StoresFile はメタ情報＋既存 Store 配列で構成される', () => {
    const file: StoresFile = {
      lastUpdated: '2026-06-08T00:00:00.000Z',
      source: { jojols: 'https://example.com/jojo', gundam: 'https://example.com/gundam' },
      stores: [
        { id: 'a', name: '店舗A', address: '東京都', lat: 35.68, lng: 139.77, games: ['jojo-ls'] },
      ],
    }
    expect(file.stores).toHaveLength(1)
    expectTypeOf<StoresFile['stores']>().toEqualTypeOf<Store[]>()
  })

  it('StoresFile は StoresMeta を内包する（メタ情報を二重定義しない）', () => {
    expectTypeOf<StoresFile>().toMatchTypeOf<StoresMeta>()
  })
})
