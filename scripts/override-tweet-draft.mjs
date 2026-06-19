// @ts-check
/**
 * override-tweet-reminder ワークフローの「修正ツイート下書き」生成ロジック。
 *
 * もとは .github/workflows/override-tweet-reminder.yml 内に巨大な jq スクリプトとして
 * 埋まっていたが、テスト不能・可読性難だったため純粋関数として切り出した。
 * 外部依存・src/ からの import を持たない自己完結 ESM なので、CI 側は追加の
 * `pnpm install` なしに `node scripts/override-tweet-draft.mjs ...` で実行できる
 * （= ワークフローの「jq + gh だけの軽量設計」を node 標準実行で踏襲）。
 *
 * 入出力:
 *   - 入力: push 前後の overrides.json と stores.json（CLI から渡す）
 *   - 出力: Issue 下書き(issueDraft)・月次レポート追記本文(reportBody)・告知有無(hasAnnouncement)
 *
 * ロジック本体は buildDraft()。CLI 部はファイル読み込みと結果の書き出しのみ。
 */

import { readFileSync, writeFileSync } from 'node:fs'

/** ゲームキー → ツイート表記。jojo-ls=ラスサバ / gundam-exvs=イニブ。 */
const GAME_LABEL = /** @type {Record<string, string>} */ ({
  'jojo-ls': 'ラスサバ',
  'gundam-exvs': 'イニブ',
})

const HASHTAG = '#ラストサバイニブ'

/** 店舗詳細として変化を監視するフィールド。値はツイートに出さず店名だけ告知する。 */
const DETAIL_FIELDS = [
  'businessHours',
  'floor',
  'smoking',
  'payments',
  'hasRecording',
  'hasStreaming',
]

/**
 * jq の `==` 相当の値比較。undefined は null とみなし、オブジェクトはキー順非依存、
 * 配列は順序依存で深く比較する（machineCounts はキー順無視、payments は順序込み）。
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  const na = a === undefined ? null : a
  const nb = b === undefined ? null : b
  if (na === nb) return true
  if (na === null || nb === null) return false
  if (typeof na !== 'object' || typeof nb !== 'object') return false
  const aArr = Array.isArray(na)
  const bArr = Array.isArray(nb)
  if (aArr !== bArr) return false
  if (aArr && bArr) {
    if (na.length !== nb.length) return false
    return na.every((v, i) => deepEqual(v, nb[i]))
  }
  const ao = /** @type {Record<string, unknown>} */ (na)
  const bo = /** @type {Record<string, unknown>} */ (nb)
  const ak = Object.keys(ao)
  const bk = Object.keys(bo)
  if (ak.length !== bk.length) return false
  return ak.every(
    (k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k]),
  )
}

/**
 * 1フィールドの取り出し。未定義なら既定値（既定は null、closed は false 相当を呼び出し側で渡す）。
 * @param {Record<string, any> | undefined} obj
 * @param {string} key
 * @param {unknown} [fallback]
 */
function field(obj, key, fallback = null) {
  return obj && obj[key] !== undefined ? obj[key] : fallback
}

/**
 * 各店舗オーバーライドが before からどう変化したかを判定する。
 * @param {Record<string, any>} beforeOverrides
 * @param {Record<string, any>} afterOverrides
 * @returns {Array<{ id: string, entry: Record<string, any>, counts: boolean, pos: boolean, details: boolean }>}
 */
export function detectChanges(beforeOverrides, afterOverrides) {
  return Object.entries(afterOverrides).map(([id, entry]) => {
    const prev = beforeOverrides[id] ?? {}
    const counts =
      !deepEqual(field(entry, 'machineCounts'), field(prev, 'machineCounts')) ||
      !deepEqual(field(entry, 'closed', false), field(prev, 'closed', false))
    const pos =
      !deepEqual(field(entry, 'lat'), field(prev, 'lat')) ||
      !deepEqual(field(entry, 'lng'), field(prev, 'lng'))
    const details = DETAIL_FIELDS.some(
      (f) => !deepEqual(field(entry, f), field(prev, f)),
    )
    return { id, entry, counts, pos, details }
  })
}

/**
 * 台数/閉店の1行。閉店なら「・店名：閉店」、それ以外は台数を「ラスサバN台 / イニブM台」で連結。
 * @param {string} name
 * @param {Record<string, any>} entry
 */
export function countLine(name, entry) {
  if (entry.closed) return `・${name}：閉店`
  const mc = /** @type {Record<string, number>} */ (entry.machineCounts ?? {})
  const parts = Object.entries(mc).map(([k, v]) => `${GAME_LABEL[k] ?? k}${v}台`)
  return `・${name}：${parts.join(' / ')}`
}

/**
 * ```で囲んだ親ポストブロックを組む（行が空なら空文字）。
 * @param {string} header
 * @param {string} lead
 * @param {string[]} lines
 */
function parentPost(header, lead, lines) {
  if (lines.length === 0) return ''
  return [header, '', lead, '', lines.join('\n'), '', HASHTAG].join('\n')
}

/** @typedef {{ id: string, entry: Record<string, any>, counts: boolean, pos: boolean, details: boolean }} Change */

/**
 * push 差分から Issue 下書き・月次レポート本文を生成する純粋関数。
 * @param {object} input
 * @param {{ overrides?: Record<string, any> }} input.before
 * @param {{ overrides?: Record<string, any> }} input.after
 * @param {{ stores?: Array<{ id: string, name: string }> }} input.stores
 * @param {string} input.today      レポート見出し用の日付（YYYY-MM-DD）
 * @param {string} input.commitShort レポート見出し・二重追記判定用の短縮SHA
 */
export function buildDraft({ before, after, stores, today, commitShort }) {
  const beforeOv = before.overrides ?? {}
  const afterOv = after.overrides ?? {}
  const nameById = Object.fromEntries((stores.stores ?? []).map((s) => [s.id, s.name]))
  /** @param {string} id */
  const nameOf = (id) => nameById[id] ?? id

  const changes = detectChanges(beforeOv, afterOv)
  /** @param {Change} c */
  const isAdmin = (c) => c.entry.source === 'admin'

  // 台数/閉店: 確定(admin)は親ポスト、未確認(source!=admin)は参考表示に回す。
  const countChanges = changes.filter((c) => c.counts)
  const lines = countChanges.filter(isAdmin).map((c) => countLine(nameOf(c.id), c.entry))
  const unconfirmed = countChanges
    .filter((c) => !isAdmin(c))
    .map((c) => countLine(nameOf(c.id), c.entry))

  // 位置・店舗詳細: 確定(admin)のみ、店名だけ告知。
  const posLines = changes.filter((c) => c.pos && isAdmin(c)).map((c) => `・${nameOf(c.id)}`)
  const detailLines = changes
    .filter((c) => c.details && isAdmin(c))
    .map((c) => `・${nameOf(c.id)}`)

  const hasAnnouncement = lines.length > 0 || posLines.length > 0 || detailLines.length > 0

  // 提供メモ(note)を @メンションの当て先ヒントとして集約。告知対象(admin)分のみ・重複排除＆整列。
  const adminNotes = changes
    .filter((c) => isAdmin(c) && (c.counts || c.pos || c.details))
    .map((c) => c.entry.note)
    .filter((n) => n != null && n !== '')
  const providers = [...new Set(adminNotes)].sort().join(', ')
  const providersOrNone = providers || '（なし）'

  const postCount = parentPost('【台数情報修正】', '下記の台数を修正しました。', lines)
  const postPos = parentPost('【位置情報修正】', '下記店舗のピン位置を修正しました。', posLines)
  const postDetail = parentPost(
    '【店舗情報更新】',
    '下記店舗の詳細情報（フロア・喫煙所・録画/配信など）を更新しました。アプリでご確認ください🙏',
    detailLines,
  )

  // Issue 用ドラフト（台数→位置→店舗情報→お礼リプ→未確認参考、存在分のみ）
  const draft = []
  if (postCount) draft.push('**親ポスト（【台数情報修正】）**', '```', postCount, '```', '')
  if (postPos) draft.push('**親ポスト（【位置情報修正】）**', '```', postPos, '```', '')
  if (postDetail) draft.push('**親ポスト（【店舗情報更新】）**', '```', postDetail, '```', '')
  draft.push(
    '**ぶら下げリプ（お礼＋メンション）**',
    '```',
    '情報提供ありがとうございました🙏 変化があればまたお知らせください。',
    '@xxx @yyy @zzz',
    '```',
    '',
    '> メンションは公開の場（リプ・引用等）で情報をくれた人のみ。DM等の個人的なやりとり由来は名前を出さない。',
    `> 提供メモ（参考）: ${providersOrNone}`,
  )
  if (unconfirmed.length) {
    draft.push(
      '',
      '> ⚠️ 未確認（みんなの報告）のため親ポストから除外した台数変更:',
      unconfirmed.join('\n'),
      '> 運営確認後に該当エントリの source を admin に上げると、次回更新で告知対象になります。',
    )
  }
  const issueDraft = draft.join('\n')

  // 月次レポート追記本文。先頭の空行は直前エントリとの区切り（ファイル末尾の改行に続けて書く）。
  const report = ['', '---', '', `## ${today} 追加分（自動記録 / コミット ${commitShort}）`, '']
  if (postCount) report.push('親ポスト（台数）:', '```', postCount, '```', '')
  if (postPos) report.push('親ポスト（位置）:', '```', postPos, '```', '')
  if (postDetail) report.push('親ポスト（店舗情報）:', '```', postDetail, '```', '')
  report.push(
    'ぶら下げリプ:',
    '```',
    '情報提供ありがとうございました🙏 変化があればまたお知らせください。',
    '@xxx',
    '```',
    '',
    `> メンションは公開の場由来のみ（DM由来は伏せる）。提供メモ参考: ${providersOrNone}`,
  )
  if (unconfirmed.length) {
    report.push(
      '',
      '> 未確認のため親ポスト除外（運営確認後に source=admin で告知対象化）:',
      unconfirmed.join('\n'),
    )
  }
  const reportBody = report.join('\n')

  return { hasAnnouncement, issueDraft, reportBody, providers }
}

// ---- CLI（ファイル読み込み・書き出しだけ。ロジックは buildDraft に集約）----

/** @param {string[]} argv `--key value` 形式をオブジェクト化 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '')
    out[key] = argv[i + 1]
  }
  return out
}

/** @param {string} p */
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  const result = buildDraft({
    before: readJson(args.before),
    after: readJson(args.after),
    stores: readJson(args.stores),
    today: args.today,
    commitShort: args.commit,
  })
  if (args['out-draft']) writeFileSync(args['out-draft'], result.issueDraft)
  if (args['out-report']) writeFileSync(args['out-report'], result.reportBody)
  // 標準出力には告知有無だけ返す（ワークフローの分岐用）
  process.stdout.write(result.hasAnnouncement ? 'true' : 'false')
}
