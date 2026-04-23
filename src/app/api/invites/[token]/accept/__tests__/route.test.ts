/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { signJwt } from '@/services/jwt'
import { MOCK_OTP_CODE, sendOtp } from '@/services/otp'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { POST } from '../route'

const ORIGIN = 'http://localhost:3000'

async function sha256Hex(text: string): Promise<string> {
  const { createHash } = require('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

function req(token: string, body?: unknown) {
  return new NextRequest(`${ORIGIN}/api/invites/${token}/accept`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
    },
    body: JSON.stringify(body ?? {}),
  })
}

async function createValidInvite() {
  const repo = getRepository()
  const primaryCg = repo.createUser({ role: 'caregiver', phone: '0811111111', name: 'Primary' })
  const elder = repo.createUser({ role: 'elder', phone: '0822222222', name: 'ย่า' })
  repo.createPairing({ elderId: elder.id, caregiverId: primaryCg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })

  const signed = await signJwt(
    { sub: primaryCg.id, kind: 'invite', elderId: elder.id, inviterId: primaryCg.id },
    ADAPTER_CONFIG.inviteTtlSec,
  )
  const tokenHash = await sha256Hex(signed.token)
  const invite = repo.createInvite({
    elderId: elder.id,
    createdByCaregiverId: primaryCg.id,
    tokenHash,
    expiresAt: new Date(signed.exp * 1000).toISOString(),
  })
  return { token: signed.token, invite, elderId: elder.id, primaryCgId: primaryCg.id }
}

async function getValidOtp(phone: string) {
  const result = await sendOtp(phone)
  if (!result.success) throw new Error('OTP send failed')
  return { code: MOCK_OTP_CODE, ref: result.ref }
}

describe('POST /api/invites/[token]/accept', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await POST(
      new NextRequest(`${ORIGIN}/api/invites/bad/accept`, {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'https://evil.com', 'content-type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ token: 'bad' }) },
    )
    expect(r.status).toBe(403)
  })

  it('rejects invalid body', async () => {
    const { token } = await createValidInvite()
    const r = await POST(req(token, { bad: 'payload' }), { params: Promise.resolve({ token }) })
    expect(r.status).toBe(400)
  })

  it('rejects invalid token', async () => {
    const phone = '0899999999'
    const otp = await getValidOtp(phone)
    const r = await POST(req('invalid-token', { phone, code: otp.code, ref: otp.ref, name: 'New CG' }), { params: Promise.resolve({ token: 'invalid-token' }) })
    expect(r.status).toBe(401)
  })

  it('returns 404 when invite not found in repo', async () => {
    const phone = '0899999999'
    const otp = await getValidOtp(phone)
    const signed = await signJwt({ sub: 'x', kind: 'invite', elderId: 'y', inviterId: 'x' }, ADAPTER_CONFIG.inviteTtlSec)
    const r = await POST(req(signed.token, { phone, code: otp.code, ref: otp.ref, name: 'New CG' }), { params: Promise.resolve({ token: signed.token }) })
    expect(r.status).toBe(404)
  })

  it('returns 409 when invite already consumed', async () => {
    const { token, invite } = await createValidInvite()
    const repo = getRepository()
    repo.updateInvite(invite.id, { acceptedByCaregiverId: 'some-cg', acceptedAt: new Date().toISOString() })
    const phone = '0899999999'
    const otp = await getValidOtp(phone)
    const r = await POST(req(token, { phone, code: otp.code, ref: otp.ref, name: 'New CG' }), { params: Promise.resolve({ token }) })
    expect(r.status).toBe(409)
  })

  it('accepts invite and creates caregiver session', async () => {
    const { token } = await createValidInvite()
    const phone = '0899999999'
    const otp = await getValidOtp(phone)
    const r = await POST(req(token, { phone, code: otp.code, ref: otp.ref, name: 'New CG' }), { params: Promise.resolve({ token }) })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.pairingId).toBeTruthy()
    expect(body.caregiverId).toBeTruthy()
  })

  it('accepts invite for existing user and updates name', async () => {
    const { token, elderId } = await createValidInvite()
    const repo = getRepository()
    const existing = repo.createUser({ role: 'caregiver', phone: '0899999999', name: 'Old Name' })
    repo.createPairing({ elderId, caregiverId: existing.id, isPrimary: false, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    const phone = '0899999999'
    const otp = await getValidOtp(phone)
    const r = await POST(req(token, { phone, code: otp.code, ref: otp.ref, name: 'Updated Name' }), { params: Promise.resolve({ token }) })
    expect(r.status).toBe(200)
  })
})
