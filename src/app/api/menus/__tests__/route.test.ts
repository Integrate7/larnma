/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { GET } from '../route'

const ORIGIN = 'http://localhost:3000'

function req(cookie: string, elderId?: string) {
  const url = elderId
    ? `${ORIGIN}/api/menus?elderId=${elderId}`
    : `${ORIGIN}/api/menus`
  return new NextRequest(url, {
    method: 'GET',
    headers: { host: 'localhost:3000', cookie },
  })
}

describe('GET /api/menus', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await GET(req(''))
    expect(r.status).toBe(401)
  })

  it('returns menus without elderId', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await GET(req(`${COOKIES.access}=${s.accessToken}`))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('returns recommended menus with elderId', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    repo.createElderProfile({
      userId: elder.id,
      conditions: ['เบาหวาน'],
      symptoms: [],
      medications: [],
      allergies: [],
      foodPreferences: [],
      foodDislikes: [],
      addressLine: '1 ถนน',
      district: 'เขต',
      province: 'กรุงเทพ',
      postalCode: '10000',
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await GET(req(`${COOKIES.access}=${s.accessToken}`, elder.id))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(Array.isArray(body.items)).toBe(true)
  })
})
