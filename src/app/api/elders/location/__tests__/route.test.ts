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

function req(cookie?: string) {
  return new NextRequest('http://localhost:3000/api/elders/location', {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

async function bootCtx() {
  const repo = getRepository()
  const cg = repo.createUser({
    role: 'caregiver',
    phone: '0811',
    name: 'CG',
  })
  const elder = repo.createUser({
    role: 'elder',
    phone: '0822',
    name: 'ย่า',
  })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    elderId: elder.id,
  }
}

describe('GET /api/elders/location', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('rejects unauthenticated', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns empty array when no location recorded', async () => {
    const { cookie } = await bootCtx()
    const res = await GET(req(cookie))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.locations).toHaveLength(0)
  })

  it('returns locations for paired elders', async () => {
    const { cookie, elderId } = await bootCtx()
    const repo = getRepository()
    repo.setElderLocation({
      elderId,
      lat: 13.7563,
      lng: 100.5018,
      capturedAt: '2026-04-23T10:00:00Z',
    })
    const res = await GET(req(cookie))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.locations).toHaveLength(1)
    expect(body.locations[0].lat).toBe(13.7563)
    expect(body.locations[0].elderId).toBe(elderId)
  })

  it('does not include locations from unpaired elders', async () => {
    const { cookie } = await bootCtx()
    const repo = getRepository()
    const other = repo.createUser({
      role: 'elder',
      phone: '0833',
      name: 'อื่น',
    })
    repo.setElderLocation({
      elderId: other.id,
      lat: 99.0,
      lng: 99.0,
      capturedAt: '2026-04-23T10:00:00Z',
    })
    const res = await GET(req(cookie))
    const body = await res.json()
    expect(body.locations).toHaveLength(0)
  })

  it('returns mock locations in development mode when no location recorded', async () => {
    const orig = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true })
    try {
      const { cookie } = await bootCtx()
      const res = await GET(req(cookie))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.locations.length).toBeGreaterThan(0)
      expect(body.locations[0]).toHaveProperty('lat')
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: orig, writable: true, configurable: true })
    }
  })
})
