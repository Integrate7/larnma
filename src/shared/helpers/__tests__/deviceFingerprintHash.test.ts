import { deviceFingerprintHash } from '../deviceFingerprint'

describe('deviceFingerprintHash', () => {
  it('returns a hex digest deterministic for the same fingerprint', async () => {
    const a = await deviceFingerprintHash()
    const b = await deviceFingerprintHash()
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]+$/)
  })
})
