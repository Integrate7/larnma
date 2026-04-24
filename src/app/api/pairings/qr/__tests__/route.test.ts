/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { POST } from '../route'

const ORIGIN = 'http://localhost:3000'

function req(cookie: string, body?: unknown) {
  return new NextRequest(`${ORIGIN}/api/pairings/qr`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      cookie,
    },
    body: JSON.stringify(body ?? {}),
  })
}

async function bootPrimaryPairing() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, elderId: elder.id }
}

describe('POST /api/pairings/qr', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await POST(
      new NextRequest(`${ORIGIN}/api/pairings/qr`, {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'https://evil.com', 'content-type': 'application/json' },
        body: '{}',
      }),
    )
    expect(r.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const r = await POST(req(''))
    expect(r.status).toBe(401)
  })

  it('rejects invalid body', async () => {
    const { cookie } = await bootPrimaryPairing()
    const r = await POST(req(cookie, { bad: 'payload' }))
    expect(r.status).toBe(400)
  })

  it('returns 403 when caregiver is not primary for elder', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: false, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req(`${COOKIES.access}=${s.accessToken}`, { elderId: elder.id }))
    expect(r.status).toBe(403)
  })

  it('returns 403 when caregiver has no pairing with elder', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req(`${COOKIES.access}=${s.accessToken}`, { elderId: elder.id }))
    expect(r.status).toBe(403)
  })

  it('returns qrDataUrl and token for primary caregiver', async () => {
    const { cookie, elderId } = await bootPrimaryPairing()
    const r = await POST(req(cookie, { elderId }))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.qrDataUrl).toMatch(/^data:image\/png/)
    expect(body.token).toBeTruthy()
    expect(body.exp).toBeTruthy()
  }, 15000)
})
