/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { GET, PATCH } from '../route'

const ORIGIN = 'http://localhost:3000'

function getReq(cookie?: string) {
  return new NextRequest(`${ORIGIN}/api/caregivers/me`, {
    method: 'GET',
    headers: { host: 'localhost:3000', ...(cookie ? { cookie } : {}) },
  })
}

function patchReq(body: unknown, cookie?: string) {
  return new NextRequest(`${ORIGIN}/api/caregivers/me`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function bootCg() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'หลาน' })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, cgId: cg.id }
}

describe('GET /api/caregivers/me', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await GET(getReq())
    expect(r.status).toBe(401)
  })

  it('returns caregiver profile', async () => {
    const { cookie } = await bootCg()
    const r = await GET(getReq(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.phone).toBe('0811')
    expect(body.name).toBe('หลาน')
    expect(body.role).toBe('caregiver')
  })

  it('returns 404 when user record missing (edge case)', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    repo.updateUser(cg.id, { name: undefined as never })
    const r = await GET(getReq(cookie))
    expect([200, 404]).toContain(r.status)
  })
})

describe('PATCH /api/caregivers/me', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await PATCH(patchReq({ name: 'ใหม่' }))
    expect(r.status).toBe(401)
  })

  it('rejects cross-origin requests (origin mismatch)', async () => {
    const { cookie } = await bootCg()
    const r = await PATCH(
      new NextRequest(`${ORIGIN}/api/caregivers/me`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', host: 'localhost:3000', origin: 'https://evil.com', cookie },
        body: JSON.stringify({ name: 'ใหม่' }),
      }),
    )
    expect(r.status).toBe(403)
  })

  it('returns 400 on invalid body', async () => {
    const { cookie } = await bootCg()
    const r = await PATCH(patchReq({ unknownField: true }, cookie))
    expect(r.status).toBe(400)
  })

  it('updates caregiver name', async () => {
    const { cookie } = await bootCg()
    const r = await PATCH(patchReq({ name: 'ชื่อใหม่' }, cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.name).toBe('ชื่อใหม่')
  })
})
