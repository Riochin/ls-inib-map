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
    expect(sent.body).toContain('報告者: なまえ')
  })

  it('token/repo 未設定なら503（GitHubへ送らない）', async () => {
    delete process.env.GITHUB_REPORT_TOKEN
    const res = await POST(req(valid))
    expect(res.status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('buildReportIssue', () => {
  it('報告者未記入は（未記入）になる', () => {
    const { body } = buildReportIssue({
      storeId: 'x',
      storeName: 'y',
      storeAddress: 'z',
      type: 'その他',
      text: 't',
    })
    expect(body).toContain('報告者: （未記入）')
  })
})
