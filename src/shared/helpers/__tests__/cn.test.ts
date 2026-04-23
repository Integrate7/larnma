import { cn } from '../cn'

describe('cn', () => {
  it('merges tailwind classes with dedup', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })
})
