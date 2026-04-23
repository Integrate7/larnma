import { deviceFingerprint } from '../deviceFingerprint'

describe('deviceFingerprint', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns stable fingerprint across calls', () => {
    const a = deviceFingerprint()
    const b = deviceFingerprint()
    expect(a).toBe(b)
    expect(a.startsWith('fp-')).toBe(true)
  })

  it('persists to localStorage', () => {
    deviceFingerprint()
    expect(window.localStorage.getItem('larnma.device.fp.v1')).toBeTruthy()
  })

  it('falls back when localStorage throws', () => {
    const orig = window.localStorage
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('no')
        },
        setItem: () => {
          throw new Error('no')
        },
      },
    })
    const fp = deviceFingerprint()
    expect(fp.startsWith('fp-')).toBe(true)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: orig,
    })
  })
})
