import { describe, it, expect } from 'vitest'
import { isEscapeKey } from '@/hooks/use-modal-a11y'

describe('isEscapeKey', () => {
  it('Escape キーなら true', () => {
    expect(isEscapeKey({ key: 'Escape' })).toBe(true)
  })

  it('Escape 以外のキーなら false', () => {
    expect(isEscapeKey({ key: 'Tab' })).toBe(false)
    expect(isEscapeKey({ key: 'Enter' })).toBe(false)
  })
})
