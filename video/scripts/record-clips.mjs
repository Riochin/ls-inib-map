/**
 * 紹介動画用の実操作クリップを本番サイトから撮影する（開発機用・macOS）。
 *
 * 使い方（video/ で）: `pnpm record [map|filter|detail]...`（引数なしで 3 本すべて）
 *
 * - ヘッドレス Chrome を CDP で操作し、`Page.startScreencast` で画面を時刻付き JPEG として受け取る
 * - 30fps の等間隔に並べ直して連番 JPEG にし、Remotion 同梱の ffmpeg（`remotion ffmpeg`）で H.264 MP4 にする
 * - 操作のたびに「何フレーム目に画面のどこを押したか」を JSON に記録する（Remotion 側のタップ表示用）
 * - 画面は iPhone 相当 375×812・3 倍密度（1125×2436）。オンボーディング／新機能モーダルは出さない
 * - 出力: `public/clips/<clip>.mp4` と `public/clips/<clip>.json`。LP のヒーロー画像と OGP は `public/assets/` にコピー
 *
 * 本番データに依存するため、店舗数やピンの見え方は撮影時点のもの。件数は JSON に入れて Remotion 側で使う。
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChrome, setupMobilePage, pageActions } from '../../scripts/lib/headless-chrome.mjs'

const VIDEO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_DIR = resolve(VIDEO_DIR, '..')
const PORT = 9336
const SITE = 'https://lsib.world'
const NEWS_VERSION = '2.4' // src/data/releases.ts の最新 version（新機能モーダル抑止）
// 店舗詳細の例。周囲に他店が無く単独ピンになり、営業時間・フロア・録画台・配信台・喫煙所・公式URL が揃っている店
const DETAIL_STORE_ID = '21d1145039bd' // namco松戸
const DETAIL_STORE_NAME = 'namco松戸'
const FPS = 30
const DSF = 3
const VIEW = { width: 375, height: 812 }
const PROFILE = join(tmpdir(), 'app-demo-profile')
const WORK = join(tmpdir(), 'app-demo-frames')
const OUT = join(VIDEO_DIR, 'public', 'clips')
const ASSETS = join(VIDEO_DIR, 'public', 'assets')

/** 3 本のクリップ。`run` は録画中の操作（録画開始後に呼ばれる）。`prepare` は録画前の準備。 */
const CLIPS = {
  map: {
    // 日本全体で 1 秒静止 → 東京を中心にホイールで 4 段ズームイン → 1.5 秒静止
    prepare: async ({ actions, sleep }) => {
      await actions.clickByLabel('ズームアウト', 10, 600) // 巣鴨(zoom15) → 日本全体(zoom5)
      await actions.drag(187, 300, 187, 400) // 日本列島を少し下げて画面に収める
      await actions.clearSelection()
      await sleep(1500)
    },
    run: async ({ rec, sleep }) => {
      await sleep(1000)
      for (let i = 0; i < 4; i++) {
        // 画面内で件数が最大のまとまったピン（＝東京圏）を中心にホイールでズームイン
        const target = (await rec.findBiggestCluster()) ?? { x: 190, y: 490 }
        await rec.wheel(target.x, target.y, -240)
        await sleep(800)
      }
      await sleep(1500)
    },
  },
  filter: {
    // 関東一円 → 絞り込みボタン → ラスサバ・4台〜・録画台あり → 「N件を表示」 → 1.5 秒静止
    prepare: async ({ actions, sleep }) => {
      await actions.clickByLabel('ズームアウト', 5, 600)
      await actions.clearSelection()
      await sleep(1500)
    },
    run: async ({ rec, sleep }) => {
      await sleep(800)
      await rec.tapByLabel('エリアで絞り込む')
      await sleep(900)
      for (const t of ['ラスサバ', '4台〜', '録画台あり']) {
        await rec.tapByText(t)
        await sleep(500)
      }
      await sleep(300)
      await rec.tapByText(/^\d+件を表示$/)
      await sleep(1800)
    },
  },
  detail: {
    // 店舗を中心に開いた状態から詳細と店舗パネルを閉じておき → ピンをタップ → 店舗パネル → 「詳細を見る」
    // → 詳細モーダル → 1 段スクロール → 1.5 秒静止
    url: `${SITE}/?store=${DETAIL_STORE_ID}`,
    prepare: async ({ rec, actions, sleep }) => {
      // 「閉じる」は Google マップ内の不可視ボタンにも付いているので、詳細モーダル内のものを座標で押す
      await rec.clickIn('[aria-labelledby="store-detail-title"]', 'button[aria-label="閉じる"]')
      await sleep(900)
      // 詳細を閉じた後に残る店舗パネル（小さいカード）も閉じる
      await rec.clickIn('[role="dialog"]', 'button[aria-label="閉じる"]', { optional: true })
      await sleep(900)
      await actions.clearSelection()
      await sleep(800)
    },
    run: async ({ rec, sleep }) => {
      await sleep(800)
      await rec.tapMarker(DETAIL_STORE_NAME)
      await sleep(1300)
      await rec.tapByText('詳細を見る')
      await sleep(3000) // 詳細モーダル（内容は 1 画面に収まるのでスクロールしない）
    },
  },
}

const nowMs = () => performance.now()

/** 録画（スクリーンキャスト受信＋タップ記録）を扱う。 */
function createRecorder(chrome, actions) {
  const { send, evaluate, sleep } = chrome
  const frames = [] // { t: ms（録画開始からの相対）, data: base64 }
  const taps = [] // { t: ms, x, y }（CSS px）
  let t0 = 0
  let offFrame = null

  const start = async () => {
    t0 = nowMs()
    offFrame = chrome.on('Page.screencastFrame', (params) => {
      frames.push({ t: nowMs() - t0, data: params.data })
      send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {})
    })
    await send('Page.startScreencast', {
      format: 'jpeg',
      quality: 90,
      maxWidth: VIEW.width * DSF,
      maxHeight: VIEW.height * DSF,
      everyNthFrame: 1,
    })
  }
  const stop = async () => {
    const durationMs = nowMs() - t0
    await send('Page.stopScreencast')
    await sleep(200)
    offFrame?.()
    return { frames, taps, durationMs }
  }

  /** 画面座標（CSS px）をタップし、時刻を記録する。 */
  const tapAt = async (x, y) => {
    taps.push({ t: nowMs() - t0, x, y })
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await sleep(60)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }
  /** 要素の中心座標を返す評価式の共通部。 */
  const centerOf = async (finder) => {
    const rect = await evaluate(`(() => { const el = (${finder})(); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
    if (!rect) throw new Error(`要素が見つかりません: ${finder}`)
    return rect
  }
  const tapByLabel = async (pattern) => {
    const { x, y } = await centerOf(
      `() => { const re = new RegExp(${JSON.stringify(pattern)}); return [...document.querySelectorAll('button')].find((el) => re.test(el.getAttribute('aria-label') ?? '') || re.test(el.title ?? '')) }`,
    )
    await tapAt(x, y)
  }
  const tapByText = async (text) => {
    const test = text instanceof RegExp ? `(s) => ${text.toString()}.test(s)` : `(s) => s === ${JSON.stringify(text)}`
    const { x, y } = await centerOf(
      `() => { const root = document.querySelector('[role=dialog]') ?? document; const test = ${test}; return [...root.querySelectorAll('button, label, [role=tab]')].find((e) => test(e.textContent.trim())) }`,
    )
    await tapAt(x, y)
  }
  /**
   * 画面内にある地図のピン（AdvancedMarker）のうち、title に文字列を含み画面中央に最も近いものの
   * 中心座標を返す（無ければ null）。画面外のピンは同じ座標に固まって報告されるため画面内に限定する。
   */
  const findMarker = (titleIncludes) =>
    evaluate(
      `(() => { const q = ${JSON.stringify(titleIncludes)}; const cx = ${VIEW.width / 2}, cy = ${VIEW.height / 2};
        const hits = [...document.querySelectorAll('gmp-advanced-marker')]
          .filter((el) => (el.getAttribute('title') ?? '').includes(q))
          .map((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
          .filter((p) => p.x >= 0 && p.x <= ${VIEW.width} && p.y >= 0 && p.y <= ${VIEW.height});
        hits.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
        return hits[0] ?? null })()`,
    )
  /** 画面内のまとまったピンのうち件数が最大のものの中心座標（無ければ null）。 */
  const findBiggestCluster = () =>
    evaluate(
      `(() => { let best = null;
        for (const el of document.querySelectorAll('gmp-advanced-marker')) {
          const m = (el.getAttribute('title') ?? '').match(/^(\\d+)件の店舗/); if (!m) continue;
          const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
          if (x < 0 || x > ${VIEW.width} || y < 0 || y > ${VIEW.height}) continue;
          const n = Number(m[1]); if (!best || n > best.n) best = { n, x, y };
        }
        return best ? { x: best.x, y: best.y } : null })()`,
    )
  /** 地図上のピンをタップする。ピン画像は座標の上に立つので、中心より少し上を押す。 */
  const tapMarker = async (storeName) => {
    const hit = await findMarker(storeName)
    if (!hit) throw new Error(`ピンが画面内に見つかりません: ${storeName}`)
    await tapAt(hit.x, hit.y - 6)
  }
  /**
   * 録画前の準備用: root 内の（表示されている）要素の中心をクリックする。タップは記録しない。
   * `optional` なら見つからなくても何もしない。
   */
  const clickIn = async (rootSelector, selector, { optional = false } = {}) => {
    const rect = await evaluate(
      `(() => { for (const root of document.querySelectorAll(${JSON.stringify(rootSelector)})) { for (const el of root.querySelectorAll(${JSON.stringify(selector)})) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 } } } return null })()`,
    )
    if (!rect) {
      if (optional) return false
      throw new Error(`要素が見つかりません: ${rootSelector} ${selector}`)
    }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
    return true
  }
  /** マウスホイール（地図のズーム／モーダルのスクロール）。 */
  const wheel = async (x, y, deltaY) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY })
  }

  void actions
  return { start, stop, tapAt, tapByLabel, tapByText, findMarker, findBiggestCluster, tapMarker, clickIn, wheel }
}

/** 受信フレームを 30fps の等間隔に並べ直して連番 JPEG に書く。戻り値はフレーム数。 */
function writeResampledFrames(frames, durationMs, dir) {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  if (frames.length === 0) throw new Error('フレームを 1 枚も受信できませんでした')
  const total = Math.max(1, Math.round((durationMs / 1000) * FPS))
  let idx = 0
  for (let i = 0; i < total; i++) {
    const t = (i / FPS) * 1000
    while (idx + 1 < frames.length && frames[idx + 1].t <= t) idx++
    writeFileSync(join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(frames[idx].data, 'base64'))
  }
  return total
}

/** 連番 JPEG を H.264 MP4 にする（Remotion 同梱 ffmpeg）。 */
function encodeMp4(framesDir, outFile) {
  mkdirSync(dirname(outFile), { recursive: true })
  const r = spawnSync(
    'pnpm',
    [
      'exec', 'remotion', 'ffmpeg', '-y',
      '-framerate', String(FPS), '-i', join(framesDir, '%05d.jpg'),
      // H.264 (yuv420p) は幅・高さが偶数である必要があるため、奇数なら 1px 切り詰める
      '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', outFile,
    ],
    { cwd: VIDEO_DIR, stdio: ['ignore', 'ignore', 'pipe'] },
  )
  if (r.status !== 0) throw new Error(`ffmpeg 失敗: ${r.stderr?.toString().slice(-800)}`)
}

/** 画面の「全 N 件」から件数を取る（取れなければ null）。 */
const readStoreCount = (chrome) =>
  chrome.evaluate(`(() => { const m = document.body.innerText.match(/全\\s*([\\d,]+)\\s*件/); return m ? Number(m[1].replace(/,/g, '')) : null })()`)

async function recordClip(name) {
  const clip = CLIPS[name]
  // --force-device-scale-factor を付けないとスクリーンキャストが CSS ピクセル寸法（375×812）でしか届かない
  const chrome = await launchChrome({
    port: PORT,
    profileDir: PROFILE,
    windowSize: [VIEW.width, VIEW.height],
    extraArgs: [`--force-device-scale-factor=${DSF}`],
  })
  const actions = pageActions(chrome)
  const rec = createRecorder(chrome, actions)
  const { sleep } = chrome
  try {
    await setupMobilePage(chrome, { newsVersion: NEWS_VERSION, deviceScaleFactor: DSF })
    await chrome.send('Page.navigate', { url: clip.url ?? `${SITE}/` })
    await sleep(7000) // 地図タイル・マーカー読込待ち
    await clip.prepare({ rec, actions, sleep, chrome })
    const storeCount = await readStoreCount(chrome)

    await rec.start()
    await clip.run({ rec, sleep, actions, chrome })
    const { frames, taps, durationMs } = await rec.stop()

    const framesDir = join(WORK, name)
    const durationInFrames = writeResampledFrames(frames, durationMs, framesDir)
    const mp4 = join(OUT, `${name}.mp4`)
    encodeMp4(framesDir, mp4)
    const meta = {
      clip: name,
      recordedAt: new Date().toISOString(),
      fps: FPS,
      durationInFrames,
      width: VIEW.width,
      height: VIEW.height,
      deviceScaleFactor: DSF,
      storeCount,
      taps: taps.map((tap) => ({ frame: Math.round((tap.t / 1000) * FPS), x: Math.round(tap.x), y: Math.round(tap.y) })),
    }
    writeFileSync(join(OUT, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`)
    console.log(`[record] ${name}: ${durationInFrames} frames (${(durationMs / 1000).toFixed(1)}s, 受信 ${frames.length} 枚), taps=${taps.length}, 店舗数=${storeCount}`)
  } finally {
    await chrome.close()
  }
}

function copyAssets() {
  mkdirSync(ASSETS, { recursive: true })
  copyFileSync(join(REPO_DIR, 'public/about/hero-map.webp'), join(ASSETS, 'hero-map.webp'))
  copyFileSync(join(REPO_DIR, 'src/app/opengraph-image.png'), join(ASSETS, 'ogp.png'))
  console.log(`[record] assets: ${ASSETS}`)
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS)
for (const name of targets) {
  if (!CLIPS[name]) throw new Error(`未知のクリップ: ${name}`)
  await recordClip(name)
}
copyAssets()
