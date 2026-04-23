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
import { DELETE } from '../route'

function req(cookie?: string, pairingId = 'p1') {
  return new NextRequest(`http://localhost:3000/api/pairings/${pairingId}`, {
    method: 'DELETE',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

async function bootCtx() {
  const repo = getRepository()
  const primary = repo.createUser({ role: 'caregiver', phone: '0811', name: 'หลาน' })
  const secondary = repo.createUser({ role: 'caregiver', phone: '0812', name: 'ลูก' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ยาย' })
  const primaryPairing = repo.createPairing({
    elderId: elder.id,
    caregiverId: primary.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const secondaryPairing = repo.createPairing({
    elderId: elder.id,
    caregiverId: secondary.id,
    isPrimary: false,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const primarySession = await issueCaregiverSession({ userId: primary.id })
  const secondarySession = await issueCaregiverSession({ userId: secondary.id })
  return {
    primaryCookie: `${COOKIES.access}=${primarySession.accessToken}`,
    secondaryCookie: `${COOKIES.access}=${secondarySession.accessToken}`,
    primaryPairingId: primaryPairing.id,
    secondaryPairingId: secondaryPairing.id,
    elderId: elder.id,
  }
}

describe('DELETE /api/pairings/[id]', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('returns 401 without auth', async () => {
    const res = await DELETE(req(), params('any'))
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent pairing', async () => {
    const { primaryCookie } = await bootCtx()
    const res = await DELETE(req(primaryCookie, 'ghost'), params('ghost'))
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not primary caregiver', async () => {
    const { secondaryCookie, secondaryPairingId } = await bootCtx()
    const res = await DELETE(req(secondaryCookie, secondaryPairingId), params(secondaryPairingId))
    expect(res.status).toBe(403)
  })

  it('returns 400 when primary tries to revoke themselves', async () => {
    const { primaryCookie, primaryPairingId } = await bootCtx()
    const res = await DELETE(req(primaryCookie, primaryPairingId), params(primaryPairingId))
    expect(res.status).toBe(400)
  })

  it('soft-deletes secondary pairing and returns ok', async () => {
    const { primaryCookie, secondaryPairingId } = await bootCtx()
    const res = await DELETE(req(primaryCookie, secondaryPairingId), params(secondaryPairingId))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    const repo = getRepository()
    const pairing = repo.getPairing(secondaryPairingId)
    expect(pairing?.revokedAt).toBeDefined()
  })
})
