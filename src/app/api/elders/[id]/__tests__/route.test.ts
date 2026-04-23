/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS, DEFAULT_SECONDARY_PERMISSIONS } from '@/shared/types'
import { GET, PATCH, DELETE } from '../route'

const ORIGIN = 'http://localhost:3000'

function makeReq(id: string, method: string, body?: unknown, cookie?: string) {
  return new NextRequest(`${ORIGIN}/api/elders/${id}`, {
    method,
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function bootWithElder(isPrimary = true) {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createElderProfile({
    userId: elder.id,
    addressLine: 'a', district: 'd', province: 'p', postalCode: '10100',
    conditions: ['เบาหวาน'], symptoms: [], medications: [], allergies: ['กุ้ง'],
    foodPreferences: [], foodDislikes: [],
  })
  repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary, permissions: isPrimary ? DEFAULT_PRIMARY_PERMISSIONS : DEFAULT_SECONDARY_PERMISSIONS })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, cgId: cg.id, elderId: elder.id }
}

describe('GET /api/elders/[id]', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await GET(makeReq('e1', 'GET'), { params: Promise.resolve({ id: 'e1' }) })
    expect(r.status).toBe(401)
  })

  it('returns 403 when no pairing exists', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await GET(makeReq(elder.id, 'GET', undefined, cookie), { params: Promise.resolve({ id: elder.id }) })
    expect(r.status).toBe(403)
  })

  it('returns elder profile when paired', async () => {
    const { cookie, elderId } = await bootWithElder()
    const r = await GET(makeReq(elderId, 'GET', undefined, cookie), { params: Promise.resolve({ id: elderId }) })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.name).toBe('ย่า')
    expect(body.allergies).toContain('กุ้ง')
  })

  it('returns 404 when elder user not found', async () => {
    const { cookie } = await bootWithElder()
    const r = await GET(makeReq('nonexistent', 'GET', undefined, cookie), { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(r.status).toBe(403)
  })
})

describe('PATCH /api/elders/[id]', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await PATCH(makeReq('e1', 'PATCH', {}), { params: Promise.resolve({ id: 'e1' }) })
    expect(r.status).toBe(401)
  })

  it('rejects cross-origin PATCH requests (origin mismatch)', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await PATCH(
      new NextRequest(`${ORIGIN}/api/elders/e1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', host: 'localhost:3000', origin: 'https://evil.com', cookie },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'e1' }) },
    )
    expect(r.status).toBe(403)
  })

  it('returns 400 on invalid body', async () => {
    const { cookie, elderId } = await bootWithElder()
    const r = await PATCH(makeReq(elderId, 'PATCH', { invalid: true }, cookie), { params: Promise.resolve({ id: elderId }) })
    expect(r.status).toBe(400)
  })

  it('updates elder health info', async () => {
    const { cookie, elderId } = await bootWithElder()
    const r = await PATCH(
      makeReq(elderId, 'PATCH', { section: 'health', fields: { allergies: ['แมว'] } }, cookie),
      { params: Promise.resolve({ id: elderId }) },
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.allergies).toContain('แมว')
  })

  it('updates elder basic name', async () => {
    const { cookie, elderId } = await bootWithElder()
    const r = await PATCH(
      makeReq(elderId, 'PATCH', { section: 'basic', fields: { name: 'ชื่อใหม่' } }, cookie),
      { params: Promise.resolve({ id: elderId }) },
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.name).toBe('ชื่อใหม่')
  })

  it('updates elder basic phone', async () => {
    const { cookie, elderId } = await bootWithElder()
    const r = await PATCH(
      makeReq(elderId, 'PATCH', { section: 'basic', fields: { phone: '0999999999' } }, cookie),
      { params: Promise.resolve({ id: elderId }) },
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.phone).toBe('0999999999')
  })

  it('returns 403 when caregiver lacks edit_elder_profile permission', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: false, permissions: { ...DEFAULT_SECONDARY_PERMISSIONS, edit_elder_profile: false } })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await PATCH(makeReq(elder.id, 'PATCH', { section: 'health', fields: { allergies: [] } }, `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: elder.id }) })
    expect(r.status).toBe(403)
  })
})

describe('DELETE /api/elders/[id]', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await DELETE(
      new NextRequest(`${ORIGIN}/api/elders/e1`, {
        method: 'DELETE',
        headers: { host: 'localhost:3000', origin: 'https://evil.com' },
      }),
      { params: Promise.resolve({ id: 'e1' }) },
    )
    expect(r.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const r = await DELETE(makeReq('e1', 'DELETE'), { params: Promise.resolve({ id: 'e1' }) })
    expect(r.status).toBe(401)
  })

  it('returns 403 for non-primary caregiver', async () => {
    const { cookie, elderId } = await bootWithElder(false)
    const r = await DELETE(makeReq(elderId, 'DELETE', undefined, cookie), { params: Promise.resolve({ id: elderId }) })
    expect(r.status).toBe(403)
  })

  it('soft-deletes elder for primary caregiver', async () => {
    const { cookie, elderId } = await bootWithElder(true)
    const r = await DELETE(makeReq(elderId, 'DELETE', undefined, cookie), { params: Promise.resolve({ id: elderId }) })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toHaveProperty('deletedAt')
    expect(body).toHaveProperty('hardDeleteAfter')
  })
})
