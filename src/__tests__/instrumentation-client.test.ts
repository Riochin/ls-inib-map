import { describe, it, expect, vi, afterEach } from 'vitest'

const initMock = vi.fn()
const replayIntegrationMock = vi.fn(() => ({ name: 'Replay' }))
const captureRouterTransitionStartMock = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  init: initMock,
  replayIntegration: replayIntegrationMock,
  captureRouterTransitionStart: captureRouterTransitionStartMock,
}))

describe('instrumentation-client', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    initMock.mockClear()
  })

  it('NEXT_PUBLIC_SENTRY_DSN 未設定時は初期化しない', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
    await import('../instrumentation-client')
    expect(initMock).not.toHaveBeenCalled()
  })

  it('NEXT_PUBLIC_SENTRY_DSN 設定時は dsn 付きで初期化する', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://example.ingest.sentry.io/1')
    await import('../instrumentation-client')
    expect(initMock).toHaveBeenCalledTimes(1)
    const config = initMock.mock.calls[0][0]
    expect(config.dsn).toBe('https://example.ingest.sentry.io/1')
    expect(config.sendDefaultPii).toBe(false)
  })

  it('user 情報が付与されたイベントは beforeSend で除去する', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://example.ingest.sentry.io/1')
    await import('../instrumentation-client')
    const config = initMock.mock.calls[0][0]
    const event = { user: { id: '1', email: 'a@example.com' } }
    const result = config.beforeSend(event)
    expect(result.user).toBeUndefined()
  })
})
