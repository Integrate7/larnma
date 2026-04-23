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
import { POST } from '../route'

function req(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost:3000/api/elder/location', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/elder/location', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('rejects unauthenticated requests', async () => {
    const res = await POST(req({ lat: 13.7, lng: 100.5 }))
    expect(res.status).toBe(401)
  })

  it('rejects invalid body', async () => {
    const repo = getRepository()
    const elder = repo.createUser({ role: 'elder', phone: '089', name: 'ย่า' })
    const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
    const res = await POST(req({ lat: 'bad' }, `${COOKIES.device}=${s.token}`))
    expect(res.status).toBe(400)
  })

  it('stores location and returns 200', async () => {
    const repo = getRepository()
    const elder = repo.createUser({ role: 'elder', phone: '089', name: 'ย่า' })
    const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
    const res = await POST(
      req({ lat: 13.7563, lng: 100.5018, accuracy: 10 }, `${COOKIES.device}=${s.token}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.elderId).toBe(elder.id)
    expect(typeof body.capturedAt).toBe('string')
    expect(repo.getElderLocation(elder.id)?.lat).toBe(13.7563)
  })
})
