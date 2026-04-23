/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueDeviceSession, issueCaregiverSession } from '@/services/auth'
import { resetEventBus, subscribe } from '@/services/eventBus'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { POST } from '../route'

function req(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost:3000/api/elder/food/request', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function bootElder() {
  const repo = getRepository()
  const elder = repo.createUser({ role: 'elder', phone: '0811', name: 'ย่า' })
  repo.createElderProfile({
    userId: elder.id,
    addressLine: 'a',
    district: 'd',
    province: 'p',
    postalCode: '10100',
    conditions: [],
    symptoms: [],
    medications: [],
    allergies: [],
    foodPreferences: [],
    foodDislikes: [],
  })
  const cg = repo.createUser({ role: 'caregiver', phone: '0822', name: 'หลาน' })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
  return { elderId: elder.id, cgId: cg.id, cookie: `${COOKIES.device}=${s.token}` }
}

async function bootCaregiver() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const s = await issueCaregiverSession({ userId: cg.id })
  return `${COOKIES.access}=${s.accessToken}`
}

describe('POST /api/elder/food/request', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
    resetEventBus()
  })

  it('rejects unauthenticated', async () => {
    const r = await POST(req({ menuId: 'kao-phat-gapraw' }))
    expect(r.status).toBe(401)
  })

  it('rejects caregiver access token (requireDevice returns 401)', async () => {
    const cookie = await bootCaregiver()
    const r = await POST(req({ menuId: 'kao-phat-gapraw' }, cookie))
    expect(r.status).toBe(401)
  })

  it('returns 400 on invalid body', async () => {
    const { cookie } = await bootElder()
    const r = await POST(req({ invalid: true }, cookie))
    expect(r.status).toBe(400)
  })

  it('returns 404 for unknown menu item', async () => {
    const { cookie } = await bootElder()
    const r = await POST(req({ menuId: 'nonexistent-menu' }, cookie))
    expect(r.status).toBe(404)
  })

  it('creates audio event and returns eventId for valid menu request', async () => {
    const { cookie } = await bootElder()
    const r = await POST(req({ menuId: 'kao-phat-gapraw' }, cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toHaveProperty('eventId')
    expect(typeof body.eventId).toBe('string')
  })

  it('publishes events to caregiver SSE stream', async () => {
    const { cookie, cgId } = await bootElder()
    const received: string[] = []
    subscribe(cgId, (e) => received.push(e.kind))
    await POST(req({ menuId: 'kao-phat-gapraw' }, cookie))
    expect(received).toContain('audio')
  })
})
