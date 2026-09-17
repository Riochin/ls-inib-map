import { SeoContent } from '@/components/SeoContent'
import { MapPage } from '@/components/MapPage'

/**
 * トップページ `/`（Server Component）。
 *
 * 検索エンジン向けの静的本文・全都道府県への内部リンク（{@link SeoContent}）と、
 * 地図アプリ本体（{@link MapPage}・Client Component）を並べる。
 * `SeoContent` はここだけで描画する（`/area`・`/about` は各自の可視 h1 を持つため、
 * root layout に置くと h1 が重複する）。
 */
export default function Page() {
  return (
    <>
      <SeoContent />
      <MapPage />
    </>
  )
}
