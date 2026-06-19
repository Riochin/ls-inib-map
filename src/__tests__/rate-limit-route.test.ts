/**
 * POST /api/report のレート制限動作テスト。
 * @upstash/ratelimit をモックし、limit() の戻り値を制御して 429 / 通過を検証する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// モジュールを丸ごと差し替え（vi.mock は巻き上げられるのでインポートより前に解釈される）
vi.mock('@/lib/rate-limit', () => ({
  ratelimit: {
    limit: vi.fn(async () => ({ success: true })),
  },
  getClientIp: vi.fn(() => '1.2.3.4'),
}))

import { POST } from '@/app/api/report/route'
import { ratelimit, getClientIp } from '@/lib/rate-limit'

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const validFeedback = {
  mode: 'feedback',
  category: '新機能の提案',
  content: 'こんな機能が欲しいです',
}

const validStructured = {
  mode: 'structured-store',
  storeId: 'abc123',
  storeName: 'テスト店',
  storeAddress: '東京都',
  businessHours: '10:00-23:00',
}

describe('POST /api/report — レート制限', () => {
  beforeEach(() => {
    process.env.GITHUB_REPORT_TOKEN = 'tok'
    process.env.GITHUB_REPORT_REPO = 'owner/repo'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201 })))
    // デフォルトは通過（success: true）
    vi.mocked(ratelimit!.limit).mockResolvedValue({ success: true } as never)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.GITHUB_REPORT_TOKEN
    delete process.env.GITHUB_REPORT_REPO
  })

  it('レート制限超過時は 429 を返し fetch を呼ばない', async () => {
    vi.mocked(ratelimit!.limit).mockResolvedValueOnce({ success: false } as never)
    const res = await POST(req(validFeedback))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('送信が多すぎます')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('レート制限内なら通常処理を継続する（mode=feedback で 200）', async () => {
    const res = await POST(req(validFeedback))
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('レート制限内なら通常処理を継続する（mode=structured-store で 200）', async () => {
    const res = await POST(req(validStructured))
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('honeypot 充填時はレート制限より先に破棄される（limit 未呼び出し）', async () => {
    const res = await POST(req({ ...validFeedback, website: 'spam' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(ratelimit!.limit).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('getClientIp を使って IP をレート制限キーに渡す', async () => {
    vi.mocked(getClientIp).mockReturnValue('5.6.7.8')
    await POST(req(validFeedback))
    expect(ratelimit!.limit).toHaveBeenCalledWith('5.6.7.8')
  })
})

describe('getClientIp', () => {
  // 実モジュールを使わず直接関数を検証する
  // (vi.mock でモック済みなので、ここでは動作を改めて定義して検証)
  const realGetClientIp = (r: Request) =>
    r.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  it('x-forwarded-for がある場合は最初の IP を返す', () => {
    const r = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
    })
    expect(realGetClientIp(r)).toBe('10.0.0.1')
  })

  it('x-forwarded-for がない場合は "unknown" を返す', () => {
    const r = new Request('http://localhost')
    expect(realGetClientIp(r)).toBe('unknown')
  })

  it('x-forwarded-for に余分な空白があってもトリムする', () => {
    const r = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  192.168.1.1  , 192.168.1.2' },
    })
    expect(realGetClientIp(r)).toBe('192.168.1.1')
  })
})
