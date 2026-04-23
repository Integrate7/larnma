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

  it('throws when JWT_SECRET env var is missing', async () => {
    const orig = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    try {
      await expect(signJwt({ sub: 'u1' }, 60)).rejects.toThrow('JWT_SECRET env var is required')
    } finally {
      process.env.JWT_SECRET = orig
    }
  })

  it('rejects non-string error in verifyJwt', async () => {
    const v = await verifyJwt('not.a.valid.jwt.at.all')
    expect(v.valid).toBe(false)
    if (!v.valid) {
      expect(typeof v.error).toBe('string')
    }
  })
})
