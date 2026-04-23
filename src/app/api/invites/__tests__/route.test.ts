/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS, DEFAULT_SECONDARY_PERMISSIONS } from '@/shared/types'
import { POST } from '../route'

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
