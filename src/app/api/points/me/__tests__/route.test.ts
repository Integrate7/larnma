/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { GET } from '../route'

const ORIGIN = 'http://localhost:3000'

function req(cookie: string) {
  return new NextRequest(`${ORIGIN}/api/points/me`, {
    method: 'GET',
    headers: { host: 'localhost:3000', cookie },
  })
}

describe('GET /api/points/me', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await GET(req(''))
    expect(r.status).toBe(401)
  })

  it('returns balance and history for authenticated caregiver', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await GET(req(`${COOKIES.access}=${s.accessToken}`))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(typeof body.balance).toBe('number')
    expect(Array.isArray(body.history)).toBe(true)
  })
})
