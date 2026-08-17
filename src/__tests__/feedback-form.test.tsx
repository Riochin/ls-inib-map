import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FeedbackForm } from '@/components/FeedbackForm'

const noop = () => {}

describe('FeedbackForm — アクセシビリティ', () => {
  it('dialog として意味付けされ、見出しに紐づく', () => {
    const html = renderToStaticMarkup(<FeedbackForm onClose={noop} />)
    const dialog = html.match(/<div[^>]*role="dialog"[^>]*>/)
    expect(dialog?.[0]).toContain('aria-modal="true"')
    expect(dialog?.[0]).toContain('aria-labelledby="feedback-form-title"')
    expect(html).toContain('id="feedback-form-title"')
  })
})
