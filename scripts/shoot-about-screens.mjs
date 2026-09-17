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
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shoot(scenario) {
  rmSync(PROFILE, { recursive: true, force: true })
  const chrome = spawn(
    CHROME,
    ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=375,812', '--hide-scrollbars', '--no-first-run', '--lang=ja', 'about:blank'],
    { stdio: 'ignore' },
  )
  let ws
  let id = 0
  const pending = new Map()
  try {
    for (let i = 0; i < 40 && !ws; i++) {
      try {
        const list = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json())
        const page = list.find((t) => t.type === 'page')
        if (page) ws = new WebSocket(page.webSocketDebuggerUrl)
      } catch {
        /* 起動待ち */
      }
      if (!ws) await sleep(250)
    }
    if (!ws) throw new Error('Chrome に接続できません')
    await new Promise((r) => (ws.onopen = r))
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg)
        pending.delete(msg.id)
      }
    }
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const myId = ++id
        pending.set(myId, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)))
        ws.send(JSON.stringify({ id: myId, method, params }))
      })
    const evaluate = (expression) =>
      send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then((r) => r.result.value)
    const clickByLabel = async (pattern, times = 1, gap = 700) => {
      for (let i = 0; i < times; i++) {
        const ok = await evaluate(
          `(() => { const re = new RegExp(${JSON.stringify(pattern)}); const b = [...document.querySelectorAll('button')].find((el) => re.test(el.getAttribute('aria-label') ?? '') || re.test(el.title ?? '')); if (!b) return false; b.click(); return true })()`,
        )
        if (!ok) throw new Error(`ボタンが見つかりません: ${pattern}`)
        await sleep(gap)
      }
    }
    // モーダル内を優先して、表示文字が一致するボタン／ラベルを押す
    const clickByText = async (text) => {
      const ok = await evaluate(
        `(() => { const root = document.querySelector('[role=dialog]') ?? document; const els = [...root.querySelectorAll('button, label, [role=tab]')]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return false; el.click(); return true })()`,
      )
      if (!ok) throw new Error(`文言が見つかりません: ${text}`)
      await sleep(300)
    }
    const drag = async (x1, y1, x2, y2) => {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 })
      const steps = 12
      for (let i = 1; i <= steps; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps, button: 'left' })
        await sleep(30)
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 })
      await sleep(800)
    }

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 3, mobile: true })
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
    await send('Emulation.setTouchEmulationEnabled', { enabled: true })
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('ls-exvs-onboarded','1'); localStorage.setItem('ls-exvs-news-seen', '${NEWS_VERSION}');`,
    })
    await send('Page.navigate', { url: scenario === 'detail' ? `${SITE}/?store=${DETAIL_STORE_ID}` : `${SITE}/` })
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
    // ドラッグ等で文字選択が残るとクラスタの数字が選択色になるため、撮影直前に解除する
    await evaluate(`(() => { window.getSelection()?.removeAllRanges(); document.activeElement?.blur?.(); return true })()`)
    await sleep(2500)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    mkdirSync(OUT_PNG, { recursive: true })
    const png = join(OUT_PNG, `${SCENARIOS[scenario].file}.png`)
    writeFileSync(png, Buffer.from(data, 'base64'))
    console.log(`[shoot] ${scenario}: ${png}`)
    return png
  } finally {
    try {
      ws?.close()
    } catch {
      /* noop */
    }
    chrome.kill()
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
