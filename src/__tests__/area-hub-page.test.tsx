import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AreaHubPage, { metadata } from '@/app/area/page'
import { getAreaPrefectures } from '@/lib/area'

/**
 * エリア一覧ハブ `/area`（Server Component・SSG）のメタデータと描画を検証する。
 * 実データ（stores）から全エリアへのリンクが生成されることを担保する。
 */

describe('/area metadata', () => {
  it('自ページの canonical（/area）を設定する', () => {
    expect(metadata.alternates?.canonical).toBe('/area')
  })

  it('タイトルを設定する', () => {
    expect(String(metadata.title)).toContain('全国')
  })
})

describe('/area page', () => {
  it('店舗が1件以上ある全都道府県へのリンクを出力する', () => {
    const html = renderToStaticMarkup(AreaHubPage())
    for (const area of getAreaPrefectures()) {
      expect(html).toContain(`href="/area/${area.slug}"`)
    }
  })
})
