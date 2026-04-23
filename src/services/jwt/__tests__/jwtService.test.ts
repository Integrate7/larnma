/**
 * @jest-environment node
 */
import { signJwt, verifyJwt } from '../jwtService'

describe('jwtService', () => {
  it('signs and verifies a token round-trip', async () => {
    const signed = await signJwt({ sub: 'u1', role: 'caregiver', kind: 'access' }, 60)
    const v = await verifyJwt<{
      sub: string
      role: string
      kind: string
      jti: string
    }>(signed.token)
    expect(v.valid).toBe(true)
    if (v.valid) {
      expect(v.payload.sub).toBe('u1')
      expect(v.payload.kind).toBe('access')
      expect(v.payload.jti).toBe(signed.jti)
    }
  })

  it('rejects tampered token', async () => {
    const { token } = await signJwt({ sub: 'u1' }, 60)
    const bad = `${token}x`
    const v = await verifyJwt(bad)
    expect(v.valid).toBe(false)
  })

  it('rejects expired token', async () => {
    const { token } = await signJwt({ sub: 'u1' }, -1)
    const v = await verifyJwt(token)
    expect(v.valid).toBe(false)
  })
})
