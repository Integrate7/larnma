/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { GET } from '../route'

function req(cookie?: string, elderId?: string) {
  const url = elderId
    ? `http://localhost:3000/api/pairings/elder?elderId=${elderId}`
    : 'http://localhost:3000/api/pairings/elder'
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

async function bootCtx() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'หลาน' })
  const cg2 = repo.createUser({ role: 'caregiver', phone: '0812', name: 'ลูก' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ยาย' })
  const pairing1 = repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const pairing2 = repo.createPairing({
    elderId: elder.id,
    caregiverId: cg2.id,
    isPrimary: false,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    elderId: elder.id,
    cgId: cg.id,
    cg2Id: cg2.id,
    pairing1Id: pairing1.id,
    pairing2Id: pairing2.id,
  }
}

describe('GET /api/pairings/elder', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('returns 401 without auth', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns 400 when elderId missing', async () => {
    const { cookie } = await bootCtx()
    const res = await GET(req(cookie))
    expect(res.status).toBe(400)
  })

  it('returns 403 when caller is not paired with elder', async () => {
    const repo = getRepository()
    const outsider = repo.createUser({ role: 'caregiver', phone: '0899', name: 'คนนอก' })
    const elder = repo.createUser({ role: 'elder', phone: '0833', name: 'ปู่' })
    const s = await issueCaregiverSession({ userId: outsider.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const res = await GET(req(cookie, elder.id))
    expect(res.status).toBe(403)
  })

  it('returns caregiver list with isCurrentUser flag', async () => {
    const { cookie, elderId, pairing1Id, pairing2Id } = await bootCtx()
    const res = await GET(req(cookie, elderId))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caregivers).toHaveLength(2)
    const me = body.caregivers.find((c: { pairingId: string }) => c.pairingId === pairing1Id)
    const other = body.caregivers.find((c: { pairingId: string }) => c.pairingId === pairing2Id)
    expect(me).toMatchObject({ name: 'หลาน', phone: '0811', isPrimary: true, isCurrentUser: true })
    expect(other).toMatchObject({ name: 'ลูก', phone: '0812', isPrimary: false, isCurrentUser: false })
  })
})
