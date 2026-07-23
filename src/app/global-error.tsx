'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

const BRAND_PURPLE = '#7B2FBE'

/**
 * ルートレベルの Error Boundary。React のレンダリングエラーを Sentry に送信する。
 * `<html>` から自前で描画する必要がある（root layout ごと差し替わるため）。
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ja">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: BRAND_PURPLE }}>
            予期しないエラーが発生しました
          </p>
          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            お手数ですが、ページを再読み込みしてください。
          </p>
        </div>
      </body>
    </html>
  )
}
