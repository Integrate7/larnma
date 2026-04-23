/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS, DEFAULT_SECONDARY_PERMISSIONS } from '@/shared/types'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { signJwt } from '@/services/jwt'
import { POST } from '../route'
import { GET as getToken } from '../[token]/route'

const ORIGIN = 'http://localhost:3000'

function req(body: unknown, cookie?: string) {
  return new NextRequest(`${ORIGIN}/api/invites`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function bootPrimaryCg() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'Primary' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, cgId: cg.id, elderId: elder.id }
}

async function bootSecondaryCg() {
  const repo = getRepository()
  const primary = repo.createUser({ role: 'caregiver', phone: '0811', name: 'Primary' })
  const secondary = repo.createUser({ role: 'caregiver', phone: '0844', name: 'Secondary' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createPairing({ elderId: elder.id, caregiverId: primary.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
  repo.createPairing({ elderId: elder.id, caregiverId: secondary.id, isPrimary: false, permissions: DEFAULT_SECONDARY_PERMISSIONS })
  const s = await issueCaregiverSession({ userId: secondary.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, elderId: elder.id }
}

describe('POST /api/invites', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await POST(req({ elderId: 'e1' }))
    expect(r.status).toBe(401)
  })

  it('rejects cross-origin requests (origin mismatch)', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(
      new NextRequest(`${ORIGIN}/api/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'localhost:3000', origin: 'https://evil.com', cookie: `${COOKIES.access}=${s.accessToken}` },
        body: JSON.stringify({ elderId: 'e1' }),
      }),
    )
    expect(r.status).toBe(403)
  })

  it('returns 400 on invalid body', async () => {
    const { cookie } = await bootPrimaryCg()
    const r = await POST(req({ invalid: true }, cookie))
    expect(r.status).toBe(400)
  })

  it('returns 403 when caregiver is not primary', async () => {
    const { cookie, elderId } = await bootSecondaryCg()
    const r = await POST(req({ elderId }, cookie))
    expect(r.status).toBe(403)
  })

  it('creates invite for primary caregiver', async () => {
    const { cookie, elderId } = await bootPrimaryCg()
    const r = await POST(req({ elderId }, cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('token')
    expect(body).toHaveProperty('url')
    expect(body).toHaveProperty('exp')
  })

  it('returns 403 when elder is not paired with caregiver', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req({ elderId: 'nonexistent' }, `${COOKIES.access}=${s.accessToken}`))
    expect(r.status).toBe(403)
  })
})

async function sha256Hex(text: string): Promise<string> {
  const { createHash } = require('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

function tokenReq(token: string) {
  return new NextRequest(`http://localhost:3000/api/invites/${token}`, {
    method: 'GET',
    headers: { host: 'localhost:3000' },
  })
}

describe('GET /api/invites/[token]', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('returns 401 for invalid token', async () => {
    const r = await getToken(tokenReq('bad-token'), { params: Promise.resolve({ token: 'bad-token' }) })
    expect(r.status).toBe(401)
  })

  it('returns 401 for token with wrong kind', async () => {
    const signed = await signJwt({ sub: 'x', kind: 'access', elderId: 'y', inviterId: 'x' }, 3600)
    const r = await getToken(tokenReq(signed.token), { params: Promise.resolve({ token: signed.token }) })
    expect(r.status).toBe(401)
  })

  it('returns 404 when invite not found in repo', async () => {
    const signed = await signJwt({ sub: 'x', kind: 'invite', elderId: 'y', inviterId: 'x' }, 3600)
    const r = await getToken(tokenReq(signed.token), { params: Promise.resolve({ token: signed.token }) })
    expect(r.status).toBe(404)
  })

  it('returns 409 when invite is already consumed', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const signed = await signJwt({ sub: cg.id, kind: 'invite', elderId: elder.id, inviterId: cg.id }, ADAPTER_CONFIG.inviteTtlSec)
    const hash = await sha256Hex(signed.token)
    const invite = repo.createInvite({ elderId: elder.id, createdByCaregiverId: cg.id, tokenHash: hash, expiresAt: new Date(signed.exp * 1000).toISOString() })
    repo.updateInvite(invite.id, { acceptedByCaregiverId: 'some-cg', acceptedAt: new Date().toISOString() })
    const r = await getToken(tokenReq(signed.token), { params: Promise.resolve({ token: signed.token }) })
    expect(r.status).toBe(409)
  })

  it('returns 410 when invite is expired', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const signed = await signJwt({ sub: cg.id, kind: 'invite', elderId: elder.id, inviterId: cg.id }, ADAPTER_CONFIG.inviteTtlSec)
    const hash = await sha256Hex(signed.token)
    repo.createInvite({ elderId: elder.id, createdByCaregiverId: cg.id, tokenHash: hash, expiresAt: new Date(Date.now() - 1000).toISOString() })
    const r = await getToken(tokenReq(signed.token), { params: Promise.resolve({ token: signed.token }) })
    expect(r.status).toBe(410)
  })

  it('returns invite details for valid non-consumed token', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const signed = await signJwt({ sub: cg.id, kind: 'invite', elderId: elder.id, inviterId: cg.id }, ADAPTER_CONFIG.inviteTtlSec)
    const hash = await sha256Hex(signed.token)
    repo.createInvite({ elderId: elder.id, createdByCaregiverId: cg.id, tokenHash: hash, expiresAt: new Date(signed.exp * 1000).toISOString() })
    const r = await getToken(tokenReq(signed.token), { params: Promise.resolve({ token: signed.token }) })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.elderId).toBe(elder.id)
    expect(body.elderName).toBe('ย่า')
  })
})
