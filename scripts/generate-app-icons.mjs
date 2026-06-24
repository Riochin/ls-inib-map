/**
 * favicon（src/app/icon.svg のマップピン）を元に、スマホのホーム画面追加で使う
 * アプリアイコン一式を生成する。
 *
 *  - src/app/apple-icon.png      iOS「ホーム画面に追加」用（180x180）
 *  - public/icons/icon-192.png   Android/PWA 用（192x192）
 *  - public/icons/icon-512.png   Android/PWA 用（512x512）
 *  - public/icons/maskable-512.png  Android のマスク可能アイコン（安全領域を広めに取る）
 *
 * iOS はアイコンの透明部分を黒で塗りつぶすため、favicon と見た目を揃えるべく
 * 白背景にピンを乗せている。配色・形状は icon.svg と同一。
 *
 * 実行: pnpm exec node scripts/generate-app-icons.mjs
 * （icon.svg を変更したら再実行すること）
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(join(root, 'src/app/icon.svg'))

const BG = '#ffffff'

/**
 * size: 出力の一辺(px) / pad: 内側余白の割合(0〜0.5)。
 * pad を大きくするとピンが小さく中央に寄る（マスク可能アイコンの安全領域用）。
 */
async function render(size, pad) {
  const inner = Math.round(size * (1 - pad * 2))
  const pin = await sharp(svg, { density: 512 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const offset = Math.round((size - inner) / 2)
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: pin, top: offset, left: offset }])
    .png()
    .toBuffer()
}

await mkdir(join(root, 'public/icons'), { recursive: true })

const targets = [
  { out: 'src/app/apple-icon.png', size: 180, pad: 0.12 },
  { out: 'public/icons/icon-192.png', size: 192, pad: 0.12 },
  { out: 'public/icons/icon-512.png', size: 512, pad: 0.12 },
  { out: 'public/icons/maskable-512.png', size: 512, pad: 0.2 },
]

for (const { out, size, pad } of targets) {
  await writeFile(join(root, out), await render(size, pad))
  console.log(`generated ${out} (${size}x${size})`)
}
