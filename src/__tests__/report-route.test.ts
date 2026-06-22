import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/report/route'
import { buildReportIssue } from '@/lib/report'

function req(body: unknown): Request {
  return new Request('http://localhost/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const valid = {
  storeId: 'abc123',
  storeName: 'テスト店',
  storeAddress: '東京都',
  type: '台数',
  text: 'イニブ8台です',
  reporter: 'なまえ',
}

describe('POST /api/report', () => {
  beforeEach(() => {
    process.env.GITHUB_REPORT_TOKEN = 'tok'
    process.env.GITHUB_REPORT_REPO = 'owner/repo'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 201 })),
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.GITHUB_REPORT_TOKEN
    delete process.env.GITHUB_REPORT_REPO
  })

  it('必須（内容）が空なら400・fetch未呼出', async () => {
    const res = await POST(req({ ...valid, text: '' }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('種別がホワイトリスト外なら400', async () => {
    const res = await POST(req({ ...valid, type: 'ほげ' }))
    expect(res.status).toBe(400)
  })

  it('honeypot 充填は ok:true かつ fetch未呼出（静かに破棄）', async () => {
    const res = await POST(req({ ...valid, website: 'http://spam.example' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('正常時は ユーザー報告 ラベルで Issue を作成し store-id を本文に含む', async () => {
    const res = await POST(req(valid))
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0]
    expect(url).toBe('https://api.github.com/repos/owner/repo/issues')
    const sent = JSON.parse(init.body as string)
    expect(sent.labels).toEqual(['ユーザー報告'])
    expect(sent.title).toContain('テスト店')
    expect(sent.body).toContain('store-id: abc123')
    expect(sent.body).toContain('SNS ID: なまえ')
  })

  it('noMention=true は本文の「お礼ツイート」が不可になる', async () => {
    await POST(req({ ...valid, noMention: true }))
    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    const sent = JSON.parse(init.body as string)
    expect(sent.body).toContain('お礼ツイート: 不可')
  })

  it('token/repo 未設定なら503（GitHubへ送らない）', async () => {
    delete process.env.GITHUB_REPORT_TOKEN
    const res = await POST(req(valid))
    expect(res.status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('POST /api/report - mode=feedback', () => {
  beforeEach(() => {
    process.env.GITHUB_REPORT_TOKEN = 'tok'
    process.env.GITHUB_REPORT_REPO = 'owner/repo'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201 })))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.GITHUB_REPORT_TOKEN
    delete process.env.GITHUB_REPORT_REPO
  })

  const validFeedback = {
    mode: 'feedback',
    category: '新機能の提案',
    content: 'こんな機能が欲しいです',
  }

  it('honeypot 充填は ok:true かつ fetch未呼出', async () => {
    const res = await POST(req({ ...validFeedback, website: 'http://spam' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('category が無効値なら400', async () => {
    const res = await POST(req({ ...validFeedback, category: 'ほげ' }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('content が空なら400', async () => {
    const res = await POST(req({ ...validFeedback, content: '' }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('環境変数未設定なら503', async () => {
    delete process.env.GITHUB_REPORT_TOKEN
    const res = await POST(req(validFeedback))
    expect(res.status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('正常時は アプリ要望 ラベルで Issue を作成する', async () => {
    const res = await POST(req(validFeedback))
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    const sent = JSON.parse(init.body as string)
    expect(sent.labels).toEqual(['アプリ要望'])
    expect(sent.title).toContain('新機能の提案')
  })

  it('GitHub API 失敗時に [report:feedback] プレフィックスでエラーログを出す', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })))
    const res = await POST(req(validFeedback))
    expect(res.status).toBe(502)
    expect(errorSpy.mock.calls[0][0]).toContain('[report:feedback]')
  })
})

describe('POST /api/report - mode=structured-store', () => {
  beforeEach(() => {
    process.env.GITHUB_REPORT_TOKEN = 'tok'
    process.env.GITHUB_REPORT_REPO = 'owner/repo'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201 })))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.GITHUB_REPORT_TOKEN
    delete process.env.GITHUB_REPORT_REPO
  })

  const baseStore = {
    mode: 'structured-store',
    storeId: 'abc123',
    storeName: 'テスト店',
    storeAddress: '東京都',
  }

  it('全属性フィールドが未入力なら400', async () => {
    const res = await POST(req(baseStore))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('machineCountsJojoLs が非整数（文字列 "abc"）なら400', async () => {
    const res = await POST(req({ ...baseStore, machineCountsJojoLs: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('machineCountsJojoLs が 99 超（100）なら400', async () => {
    const res = await POST(req({ ...baseStore, machineCountsJojoLs: 100 }))
    expect(res.status).toBe(400)
  })

  it('machineCountsJojoLs が小数（3.5）なら400', async () => {
    const res = await POST(req({ ...baseStore, machineCountsJojoLs: 3.5 }))
    expect(res.status).toBe(400)
  })

  it('payments が 21 件なら400', async () => {
    const payments = Array.from({ length: 21 }, (_, i) => `pay${i}`)
    const res = await POST(req({ ...baseStore, payments }))
    expect(res.status).toBe(400)
  })

  it('payments の要素が 30 文字超なら400', async () => {
    const res = await POST(req({ ...baseStore, payments: ['a'.repeat(31)] }))
    expect(res.status).toBe(400)
  })

  it('businessHours のみ入力で200・ユーザー報告ラベル', async () => {
    const res = await POST(req({ ...baseStore, businessHours: '10:00-23:00' }))
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    const sent = JSON.parse(init.body as string)
    expect(sent.labels).toEqual(['ユーザー報告'])
    expect(sent.body).toContain('10:00-23:00')
  })

  it('honeypot 充填は ok:true かつ fetch未呼出', async () => {
    const res = await POST(req({ ...baseStore, businessHours: '10:00-23:00', website: 'bot' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('録画台/配信台のタイトル別キーを受け付け、Issue本文にタイトル別行を出す', async () => {
    const res = await POST(
      req({ ...baseStore, hasRecordingGundamExvs: 'yes', hasStreamingJojoLs: 'no' }),
    )
    expect(res.status).toBe(200)
    const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    const sent = JSON.parse(init.body as string)
    expect(sent.body).toContain('録画台（イニブ）')
    expect(sent.body).toContain('配信台（ラスサバ）')
  })

  it('録画台/配信台のタイトル別キー単体でも hasAnyInput を満たし200', async () => {
    const res = await POST(req({ ...baseStore, hasStreamingGundamExvs: 'yes' }))
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('不正な三値（yes/no/unknown以外）は無視され、それだけなら400', async () => {
    const res = await POST(req({ ...baseStore, hasRecordingJojoLs: 'maybe' }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('GitHub API 失敗時に [report:structured-store] プレフィックスでエラーログを出す', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })))
    const res = await POST(req({ ...baseStore, businessHours: '10:00-23:00' }))
    expect(res.status).toBe(502)
    expect(errorSpy.mock.calls[0][0]).toContain('[report:structured-store]')
  })
})

describe('buildReportIssue', () => {
  it('SNS ID未記入は「みんなの報告（未確認）」扱いで確定不可', () => {
    const { body } = buildReportIssue({
      storeId: 'x',
      storeName: 'y',
      storeAddress: 'z',
      type: 'その他',
      text: 't',
    })
    expect(body).toContain('SNS ID: （未記入）')
    expect(body).toContain('確定可否: SNS ID未記入')
    expect(body).toContain('お礼ツイート: —')
  })

  it('SNS ID提供ありは確定可・お礼ツイート可（noMention未指定）', () => {
    const { body } = buildReportIssue({
      storeId: 'x',
      storeName: 'y',
      storeAddress: 'z',
      type: 'その他',
      text: 't',
      reporter: 'myid',
    })
    expect(body).toContain('SNS ID: myid')
    expect(body).toContain('確定可否: SNS ID提供あり')
    expect(body).toContain('お礼ツイート: 可')
  })

  it('本文の @メンション / #Issue参照を無効化する（通知スパム防止）', () => {
    const { body, title } = buildReportIssue({
      storeId: 'x',
      storeName: '@org',
      storeAddress: 'z',
      type: 'その他',
      text: 'cc @victim 直してほしい #1',
      reporter: '@me',
    })
    // 連続した @mention / #ref は本文・タイトルに残らない（直後にゼロ幅スペースが入る）
    expect(body).not.toContain('@victim')
    expect(body).not.toContain('@me')
    expect(body).not.toContain('#1')
    expect(title).not.toContain('@org')
    expect(body).toContain('@​')
  })
})
