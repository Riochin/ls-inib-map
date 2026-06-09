import { notFound } from 'next/navigation'
import { OverridesAdmin } from './OverridesAdmin'

/**
 * 手動オーバーライド編集GUI（localhost専用）。
 * 本番では 404（FS書き込み不可・公開不要なため）。
 */

export const dynamic = 'force-dynamic'

export default function AdminOverridesPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <OverridesAdmin />
}
