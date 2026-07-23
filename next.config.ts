import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // SENTRY_AUTH_TOKEN 未設定時はソースマップアップロードのみスキップされ、ビルドは失敗しない。
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
  // 広告ブロッカーが *.ingest.sentry.io を遮断するため、同一オリジン経由で中継する。
  tunnelRoute: '/monitoring',
})
