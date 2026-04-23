import { deviceFingerprintHash } from '../deviceFingerprint'

describe('deviceFingerprintHash', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns a hex digest deterministic for the same fingerprint', async () => {
    const a = await deviceFingerprintHash()
    const b = await deviceFingerprintHash()
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]+$/)
  })

  it('uses crypto.subtle when available', async () => {
    const origCrypto = globalThis.crypto
    const fakeDigest = jest.fn().mockResolvedValue(new Uint8Array([0xab, 0xcd, 0xef]).buffer)
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: { digest: fakeDigest } },
      writable: true,
      configurable: true,
    })
    const hash = await deviceFingerprintHash()
    expect(typeof hash).toBe('string')
    expect(hash).toMatch(/^[0-9a-f]+$/)
    Object.defineProperty(globalThis, 'crypto', {
      value: origCrypto,
      writable: true,
      configurable: true,
    })
  })
})
