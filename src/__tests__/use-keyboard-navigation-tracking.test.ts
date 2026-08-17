import { describe, it, expect } from 'vitest'
import { isFirstTabKeydown } from '@/hooks/use-keyboard-navigation-tracking'

describe('isFirstTabKeydown', () => {
  it('Tab キーなら true', () => {
    expect(isFirstTabKeydown({ key: 'Tab' })).toBe(true)
  })

  it('Tab 以外のキーなら false', () => {
    expect(isFirstTabKeydown({ key: 'Enter' })).toBe(false)
    expect(isFirstTabKeydown({ key: 'Escape' })).toBe(false)
  })
})
