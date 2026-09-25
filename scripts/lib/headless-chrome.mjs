/**
 * ヘッドレス Chrome の起動と Chrome DevTools Protocol（CDP）接続の共通部（開発機用・macOS）。
 *
 * `scripts/shoot-about-screens.mjs`（LP 用スクショ）と `video/scripts/record-clips.mjs`（紹介動画の
 * 実操作クリップ）が同じ起動・接続・イベント購読を使う。Node 22+ のグローバル `fetch` / `WebSocket` 前提。
 *
 * 使い方:
 *   const chrome = await launchChrome({ port: 9333, profileDir })
 *   await chrome.send('Page.enable')
 *   chrome.on('Page.screencastFrame', (params) => { ... })
 *   const value = await chrome.evaluate('document.title')
 *   await chrome.close()
 */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'

export const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** ディレクトリを削除する。直前の Chrome が書き込み中で失敗したら少し待って再試行する。 */
async function removeDirWithRetry(dir, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    try {
      rmSync(dir, { recursive: true, force: true })
      return
    } catch (err) {
      if (i === attempts - 1) throw err
      await sleep(300)
    }
  }
}

/**
 * Chrome をヘッドレスで起動し、最初のページターゲットに CDP で接続する。
 * @param {object} options
 * @param {number} options.port リモートデバッグポート
 * @param {string} options.profileDir ユーザーデータ置き場（毎回初期化して前回の localStorage 等を持ち越さない）
 * @param {[number, number]} [options.windowSize] ウィンドウ幅・高さ（既定 375×812）
 * @param {string[]} [options.extraArgs] 追加の起動引数
 */
export async function launchChrome({ port, profileDir, windowSize = [375, 812], extraArgs = [] }) {
  await removeDirWithRetry(profileDir)
  const proc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${windowSize[0]},${windowSize[1]}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--lang=ja',
      ...extraArgs,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let ws = null
  for (let i = 0; i < 40 && !ws; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json())
      const page = list.find((t) => t.type === 'page')
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl)
    } catch {
      /* 起動待ち */
    }
    if (!ws) await sleep(250)
  }
  if (!ws) {
    proc.kill()
    throw new Error('Chrome に接続できません（起動していないかポートが使用中）')
  }
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
      return
    }
    if (msg.method && listeners.has(msg.method)) {
      for (const handler of listeners.get(msg.method)) handler(msg.params)
    }
  }

  /** CDP メソッドを呼び、result を返す（error は例外）。 */
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result)))
      ws.send(JSON.stringify({ id, method, params }))
    })

  /** ページ内で式を評価し、JSON 化した値を返す。 */
  const evaluate = (expression) =>
    send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then((r) => {
      if (r.exceptionDetails) throw new Error(`evaluate 失敗: ${r.exceptionDetails.text}`)
      return r.result.value
    })

  /** CDP イベント（例 `Page.screencastFrame`）を購読する。解除関数を返す。 */
  const on = (method, handler) => {
    const list = listeners.get(method) ?? []
    list.push(handler)
    listeners.set(method, list)
    return () => listeners.set(method, (listeners.get(method) ?? []).filter((h) => h !== handler))
  }

  /** 接続を閉じ、Chrome プロセスの終了まで待つ（次の起動でプロファイル削除が競合しないように）。 */
  const close = async () => {
    try {
      ws.close()
    } catch {
      /* noop */
    }
    if (proc.exitCode !== null) return
    await new Promise((resolve) => {
      proc.once('exit', resolve)
      proc.kill()
      setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {
          /* noop */
        }
      }, 3000)
    })
  }

  return { send, evaluate, on, close, sleep }
}

/**
 * 本サイト共通の「iPhone 相当の画面」設定とモーダル抑止をまとめて適用する。
 * @param {Awaited<ReturnType<typeof launchChrome>>} chrome
 * @param {object} options
 * @param {string} options.newsVersion `src/data/releases.ts` の最新 version（新機能モーダルを出さないため）
 * @param {number} [options.deviceScaleFactor] 既定 3
 */
export async function setupMobilePage(chrome, { newsVersion, deviceScaleFactor = 3 }) {
  await chrome.send('Page.enable')
  await chrome.send('Runtime.enable')
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor, mobile: true })
  await chrome.send('Emulation.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await chrome.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('ls-exvs-onboarded','1'); localStorage.setItem('ls-exvs-news-seen', '${newsVersion}');`,
  })
}

/**
 * ページ操作ヘルパー群（aria-label／表示文字でのクリック、ドラッグ、選択解除）。
 * @param {Awaited<ReturnType<typeof launchChrome>>} chrome
 */
export function pageActions(chrome) {
  const { send, evaluate, sleep } = chrome

  /** aria-label か title が正規表現に一致する最初の button を押す（times 回、gap ms 間隔）。 */
  const clickByLabel = async (pattern, times = 1, gap = 700) => {
    for (let i = 0; i < times; i++) {
      const ok = await evaluate(
        `(() => { const re = new RegExp(${JSON.stringify(pattern)}); const b = [...document.querySelectorAll('button')].find((el) => re.test(el.getAttribute('aria-label') ?? '') || re.test(el.title ?? '')); if (!b) return false; b.click(); return true })()`,
      )
      if (!ok) throw new Error(`ボタンが見つかりません: ${pattern}`)
      await sleep(gap)
    }
  }

  /** モーダル内を優先して、表示文字が一致する button / label / tab を押す。 */
  const clickByText = async (text, gap = 300) => {
    const ok = await evaluate(
      `(() => { const root = document.querySelector('[role=dialog]') ?? document; const els = [...root.querySelectorAll('button, label, [role=tab]')]; const el = els.find((e) => e.textContent.trim() === ${JSON.stringify(text)}); if (!el) return false; el.click(); return true })()`,
    )
    if (!ok) throw new Error(`文言が見つかりません: ${text}`)
    await sleep(gap)
  }

  /** マウスドラッグ（地図のパン用）。 */
  const drag = async (x1, y1, x2, y2, steps = 12) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 })
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: x1 + ((x2 - x1) * i) / steps,
        y: y1 + ((y2 - y1) * i) / steps,
        button: 'left',
      })
      await sleep(30)
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 })
    await sleep(800)
  }

  /** ドラッグ等で残った文字選択を解除する（クラスタの数字が選択色になるのを防ぐ）。 */
  const clearSelection = () =>
    evaluate(`(() => { window.getSelection()?.removeAllRanges(); document.activeElement?.blur?.(); return true })()`)

  return { clickByLabel, clickByText, drag, clearSelection }
}
