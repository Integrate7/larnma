/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueDeviceSession, issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { GET } from '../route'

function req(cookie?: string) {
  return new NextRequest('http://localhost:3000/api/elder/events/stream', {
    method: 'GET',
    headers: { host: 'localhost:3000', ...(cookie ? { cookie } : {}) },
  })
}

async function bootElder() {
  const repo = getRepository()
  const elder = repo.createUser({ role: 'elder', phone: '0811', name: 'ย่า' })
  const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
  return `${COOKIES.device}=${s.token}`
}

async function bootCaregiver() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const s = await issueCaregiverSession({ userId: cg.id })
  return `${COOKIES.access}=${s.accessToken}`
}

describe('GET /api/elder/events/stream', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated with 401', async () => {
    const r = await GET(req())
    expect(r.status).toBe(401)
  })

  it('rejects caregiver access token (requireDevice returns 401)', async () => {
    const cookie = await bootCaregiver()
    const r = await GET(req(cookie))
    expect(r.status).toBe(401)
  })

  it('returns SSE stream response for authenticated elder', async () => {
    const cookie = await bootElder()
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('text/event-stream')
    expect(r.headers.get('cache-control')).toBe('no-cache')
    expect(r.body).not.toBeNull()
    const reader = r.body?.getReader()
    if (reader) {
      await reader.read()
      await reader.cancel()
    }
  })
})
