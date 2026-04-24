/**
 * @jest-environment node
 */
import { navigateToTel } from '../telNavigation'

describe('navigateToTel (SSR)', () => {
  it('is a no-op when window is undefined', () => {
    // This test runs under jest-environment node, where `window` is genuinely
    // not defined on the global. The guard `if (typeof window === 'undefined') return`
    // is therefore actually exercised here.
    expect(typeof window).toBe('undefined')
    expect(() => navigateToTel('0812345678')).not.toThrow()
  })
})
