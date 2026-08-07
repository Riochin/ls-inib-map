import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnboardingModal } from '@/components/Onboarding'

const noop = () => {}

describe('OnboardingModal — アクセシビリティ', () => {
  it('dialog として意味付けされ、固定のラベルを持つ', () => {
    const html = renderToStaticMarkup(<OnboardingModal onClose={noop} onOpenFeedback={noop} />)
    const dialog = html.match(/<div[^>]*role="dialog"[^>]*>/)
    expect(dialog?.[0]).toContain('aria-modal="true"')
    expect(dialog?.[0]).toContain('aria-label="操作案内"')
  })

  it('ページインジケータが現在ページを読み上げ用テキストで示す', () => {
    const html = renderToStaticMarkup(<OnboardingModal initialPage={2} onClose={noop} onOpenFeedback={noop} />)
    expect(html).toContain('aria-label="5ページ中3ページ目"')
  })
})
