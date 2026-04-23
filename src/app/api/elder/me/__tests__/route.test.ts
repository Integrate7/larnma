/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { issueDeviceSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { GET } from '../route'

function req(cookie?: string) {
  return new NextRequest('http://localhost:3000/api/elder/me', {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

describe('/api/elder/me', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('rejects unauth', async () => {
    const r = await GET(req())
    expect(r.status).toBe(401)
  })

  it('returns elder info when device-authed', async () => {
    const repo = getRepository()
    const elder = repo.createUser({
      role: 'elder',
      phone: '089',
      name: 'ย่า',
    })
    repo.createElderProfile({
      userId: elder.id,
      addressLine: 'a',
      district: 'd',
      province: 'p',
      postalCode: '10100',
      conditions: ['เบาหวาน'],
      symptoms: [],
      medications: [],
      allergies: [],
      foodPreferences: [],
      foodDislikes: [],
    })
    const caregiver = repo.createUser({
      role: 'caregiver',
      phone: '08121',
      name: 'CG',
    })
    repo.createPairing({
      elderId: elder.id,
      caregiverId: caregiver.id,
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })

    const s = await issueDeviceSession({
      elderId: elder.id,
      fingerprint: 'fp',
    })
    const r = await GET(req(`${COOKIES.device}=${s.token}`))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.name).toBe('ย่า')
    expect(body.conditions).toEqual(['เบาหวาน'])
    expect(body.primaryCaregiver?.name).toBe('CG')
  })

  it('404 when no profile', async () => {
    const s = await issueDeviceSession({ elderId: 'unknown', fingerprint: 'fp' })
    const r = await GET(req(`${COOKIES.device}=${s.token}`))
    expect(r.status).toBe(404)
  })
})
