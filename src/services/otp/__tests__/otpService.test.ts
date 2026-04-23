import { __setRepository, createInMemoryRepository } from '@/services/repository'
import { MOCK_OTP_CODE, sendOtp, verifyOtp } from '../otpService'

describe('otpService', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('sendOtp returns ref + expiresAt', async () => {
    const r = await sendOtp('0812345678')
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.ref).toBeTruthy()
      expect(new Date(r.expiresAt).getTime()).toBeGreaterThan(Date.now())
    }
  })

  it('verifyOtp happy path with mock code 123456', async () => {
    const s = await sendOtp('0812345678')
    if (!s.success) throw new Error('send failed')
    const v = await verifyOtp({
      phone: '0812345678',
      code: MOCK_OTP_CODE,
      ref: s.ref,
    })
    expect(v.success).toBe(true)
  })

  it('verifyOtp rejects wrong code and increments attempts', async () => {
    const s = await sendOtp('0812345678')
    if (!s.success) throw new Error('send failed')
    const v1 = await verifyOtp({
      phone: '0812345678',
      code: '000000',
      ref: s.ref,
    })
    expect(v1.success).toBe(false)
    if (!v1.success) expect(v1.error).toBe('INVALID')
  })

  it('verifyOtp locks after 3 failed attempts', async () => {
    const s = await sendOtp('0812345678')
    if (!s.success) throw new Error('send failed')
    for (let i = 0; i < 3; i += 1) {
      await verifyOtp({
        phone: '0812345678',
        code: '000000',
        ref: s.ref,
      })
    }
    const v = await verifyOtp({
      phone: '0812345678',
      code: MOCK_OTP_CODE,
      ref: s.ref,
    })
    expect(v.success).toBe(false)
    if (!v.success) expect(v.error).toBe('LOCKED')
  })

  it('verifyOtp rejects unknown ref', async () => {
    const v = await verifyOtp({ phone: '08', code: MOCK_OTP_CODE, ref: 'nope' })
    expect(v.success).toBe(false)
    if (!v.success) expect(v.error).toBe('NOT_FOUND')
  })

  it('verifyOtp rejects phone mismatch', async () => {
    const s = await sendOtp('0811')
    if (!s.success) throw new Error('send failed')
    const v = await verifyOtp({ phone: '0822', code: MOCK_OTP_CODE, ref: s.ref })
    expect(v.success).toBe(false)
    if (!v.success) expect(v.error).toBe('INVALID')
  })

  it('verifyOtp rejects reuse after consume', async () => {
    const s = await sendOtp('0811')
    if (!s.success) throw new Error('send failed')
    await verifyOtp({ phone: '0811', code: MOCK_OTP_CODE, ref: s.ref })
    const v = await verifyOtp({ phone: '0811', code: MOCK_OTP_CODE, ref: s.ref })
    expect(v.success).toBe(false)
    if (!v.success) expect(v.error).toBe('CONSUMED')
  })

  it('verifyOtp rejects expired challenge', async () => {
    const s = await sendOtp('0811')
    if (!s.success) throw new Error('send failed')
    // force expire via repository
    const { getRepository } = await import('@/services/repository')
    const repo = getRepository()
    const latest = repo.latestOtpChallengeByPhone('0811')
    if (!latest) throw new Error('missing')
    repo.updateOtpChallenge(latest.id, {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    })
    const v = await verifyOtp({ phone: '0811', code: MOCK_OTP_CODE, ref: s.ref })
    expect(v.success).toBe(false)
    if (!v.success) expect(v.error).toBe('EXPIRED')
  })

  it('sendOtp rate-limits after 3 sends in window', async () => {
    await sendOtp('0811')
    await sendOtp('0811')
    await sendOtp('0811')
    const r = await sendOtp('0811')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toBe('RATE_LIMITED')
  })

  it('sendOtp rejects when locked', async () => {
    const s = await sendOtp('0811')
    if (!s.success) throw new Error('send failed')
    const { getRepository } = await import('@/services/repository')
    const repo = getRepository()
    const latest = repo.latestOtpChallengeByPhone('0811')
    if (!latest) throw new Error('missing')
    repo.updateOtpChallenge(latest.id, {
      lockedUntil: new Date(Date.now() + 60_000).toISOString(),
    })
    const r = await sendOtp('0811')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toBe('LOCKED')
  })
})
