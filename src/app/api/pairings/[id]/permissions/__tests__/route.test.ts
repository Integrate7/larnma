/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS, DEFAULT_SECONDARY_PERMISSIONS } from '@/shared/types'
import { PATCH } from '../route'

const ORIGIN = 'http://localhost:3000'

function req(id: string, cookie: string, body?: unknown) {
  return new NextRequest(`${ORIGIN}/api/pairings/${id}/permissions`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      cookie,
    },
    body: JSON.stringify(body ?? { permissions: DEFAULT_SECONDARY_PERMISSIONS }),
  })
}

async function bootCtx() {
  const repo = getRepository()
  const primaryCg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'Primary' })
  const secondaryCg = repo.createUser({ role: 'caregiver', phone: '0822', name: 'Secondary' })
  const elder = repo.createUser({ role: 'elder', phone: '0833', name: 'ย่า' })
  repo.createPairing({ elderId: elder.id, caregiverId: primaryCg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
  const secondaryPairing = repo.createPairing({ elderId: elder.id, caregiverId: secondaryCg.id, isPrimary: false, permissions: DEFAULT_SECONDARY_PERMISSIONS })
  const s = await issueCaregiverSession({ userId: primaryCg.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    primaryId: primaryCg.id,
    secondaryCgId: secondaryCg.id,
    elderId: elder.id,
    secondaryPairingId: secondaryPairing.id,
  }
}

describe('PATCH /api/pairings/[id]/permissions', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await PATCH(
      new NextRequest(`${ORIGIN}/api/pairings/x/permissions`, {
        method: 'PATCH',
        headers: { host: 'localhost:3000', origin: 'https://evil.com', 'content-type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ id: 'x' }) },
    )
    expect(r.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const r = await PATCH(req('x', ''), { params: Promise.resolve({ id: 'x' }) })
    expect(r.status).toBe(401)
  })

  it('returns 404 for unknown pairing', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await PATCH(req('nope', `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: 'nope' }) })
    expect(r.status).toBe(404)
  })

  it('returns 403 when requester is not primary caregiver for that elder', async () => {
    const repo = getRepository()
    const nonPrimary = repo.createUser({ role: 'caregiver', phone: '0811', name: 'NP' })
    const secondaryCg = repo.createUser({ role: 'caregiver', phone: '0822', name: 'SC' })
    const elder = repo.createUser({ role: 'elder', phone: '0833', name: 'ย่า' })
    repo.createPairing({ elderId: elder.id, caregiverId: nonPrimary.id, isPrimary: false, permissions: DEFAULT_SECONDARY_PERMISSIONS })
    const secondaryPairing = repo.createPairing({ elderId: elder.id, caregiverId: secondaryCg.id, isPrimary: false, permissions: DEFAULT_SECONDARY_PERMISSIONS })
    const s = await issueCaregiverSession({ userId: nonPrimary.id })
    const r = await PATCH(req(secondaryPairing.id, `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: secondaryPairing.id }) })
    expect(r.status).toBe(403)
  })

  it('returns 403 when trying to edit primary pairing', async () => {
    const repo = getRepository()
    const primaryCg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'Primary' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const primaryPairing = repo.createPairing({ elderId: elder.id, caregiverId: primaryCg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    const s = await issueCaregiverSession({ userId: primaryCg.id })
    const r = await PATCH(req(primaryPairing.id, `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: primaryPairing.id }) })
    expect(r.status).toBe(403)
  })

  it('rejects invalid permissions body', async () => {
    const { cookie, secondaryPairingId } = await bootCtx()
    const r = await PATCH(req(secondaryPairingId, cookie, { bad: true }), { params: Promise.resolve({ id: secondaryPairingId }) })
    expect(r.status).toBe(400)
  })

  it('updates permissions successfully', async () => {
    const { cookie, secondaryPairingId } = await bootCtx()
    const newPerms = { ...DEFAULT_SECONDARY_PERMISSIONS, receive_noti: true }
    const r = await PATCH(req(secondaryPairingId, cookie, { permissions: newPerms }), { params: Promise.resolve({ id: secondaryPairingId }) })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.id).toBe(secondaryPairingId)
    expect(body.permissions.receive_noti).toBe(true)
  })
})
