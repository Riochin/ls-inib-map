/**
 * `/about` LP 用の実機スクリーンショットを本番サイトから撮影して `public/about/` に置く（開発機用・macOS）。
 *
 * 使い方: `node scripts/shoot-about-screens.mjs [hero|tokyo|filter|detail]...`（引数なしで4枚すべて）
 *
 * - ヘッドレス Chrome（/Applications/Google Chrome.app）を CDP で操作し、iPhone 相当（375×812・3倍密度）で撮る
 * - オンボーディング／新機能モーダルは localStorage を先に埋めて出さない。撮影ごとにプロファイルを初期化する
 * - `cwebp` があれば WebP（ヒーロー幅 640・他 560）へ変換して `public/about/` に書く。無ければ PNG を残すだけ
 * - 端末枠は画像に焼き込まない（`PhoneFrame` コンポーネントが CSS で付ける）
 *
 * データ（店舗数・ピン）が変わって画像が古くなったら、これで撮り直して `src/lib/about-copy.ts` の寸法を確認する。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CHROME_PATH, launchChrome, setupMobilePage, pageActions } from './lib/headless-chrome.mjs'

const CHROME = CHROME_PATH
const PORT = 9333
const SITE = 'https://lsib.world'
const NEWS_VERSION = '2.4' // src/data/releases.ts の最新 version。新機能モーダルを出さないために合わせる
const DETAIL_STORE_ID = '994aeeab3dfd' // タイトーステーション渋谷（店舗詳細の例）
const OUT_PNG = join(tmpdir(), 'about-shots')
const OUT_WEBP = 'public/about'
const PROFILE = join(tmpdir(), 'about-shots-profile')

/** シナリオ → { 出力ファイル名, WebP 幅 } */
const SCENARIOS = {
  hero: { file: 'hero-map', width: 640 },
  tokyo: { file: 'feature-map', width: 560 },
  filter: { file: 'feature-filter', width: 560 },
  detail: { file: 'feature-detail', width: 560 },
}

async function shoot(scenario) {
  const chrome = await launchChrome({ port: PORT, profileDir: PROFILE })
  const { sleep } = chrome
  const { clickByLabel, clickByText, drag, clearSelection } = pageActions(chrome)
  try {
    await setupMobilePage(chrome, { newsVersion: NEWS_VERSION })
    await chrome.send('Page.navigate', { url: scenario === 'detail' ? `${SITE}/?store=${DETAIL_STORE_ID}` : `${SITE}/` })
    await sleep(7000) // 地図タイル・マーカー読込待ち

    if (scenario === 'hero') {
      await clickByLabel('ズームアウト', 10) // 巣鴨(zoom15) → 日本全体(zoom5)
      await drag(187, 300, 235, 470) // 日本列島を画面中央寄りへ（九州が左端で切れないように）
    }
    if (scenario === 'tokyo') await clickByLabel('ズームアウト', 5) // 関東一円
    if (scenario === 'filter') {
      await clickByLabel('エリアで絞り込む')
      await sleep(600)
      for (const t of ['ラスサバ', '4台〜', '録画台あり']) await clickByText(t)
    }
    await clearSelection()
    await sleep(2500)
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' })
    mkdirSync(OUT_PNG, { recursive: true })
    const png = join(OUT_PNG, `${SCENARIOS[scenario].file}.png`)
    writeFileSync(png, Buffer.from(data, 'base64'))
    console.log(`[shoot] ${scenario}: ${png}`)
    return png
  } finally {
    await chrome.close()
  }
}

function toWebp(png, scenario) {
  const { file, width } = SCENARIOS[scenario]
  const out = join(OUT_WEBP, `${file}.webp`)
  const r = spawnSync('cwebp', ['-quiet', '-q', '80', '-resize', String(width), '0', png, '-o', out])
  if (r.error || r.status !== 0) {
    console.warn(`[shoot] cwebp が使えないため WebP 変換をスキップ（PNG: ${png}）`)
    return
  }
  console.log(`[shoot] ${scenario}: ${out}`)
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENARIOS)
if (!existsSync(CHROME)) throw new Error(`Chrome が見つかりません: ${CHROME}`)
for (const scenario of targets) {
  if (!SCENARIOS[scenario]) throw new Error(`未知のシナリオ: ${scenario}`)
  const png = await shoot(scenario)
  toWebp(png, scenario)
}
