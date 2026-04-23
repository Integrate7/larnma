/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { POST } from '../route'

const ORIGIN = 'http://localhost:3000'

function req(cookie: string, body?: unknown) {
  return new NextRequest(`${ORIGIN}/api/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      cookie,
    },
    body: body !== undefined ? JSON.stringify(body) : '{}',
  })
}

async function bootCtx() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, cgId: cg.id, elderId: elder.id }
}

const validMenu = [{ name: 'ข้าวผัด', price: 85, qty: 1 }]

describe('POST /api/orders', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await POST(
      new NextRequest(`${ORIGIN}/api/orders`, {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'https://evil.com', 'content-type': 'application/json' },
        body: '{}',
      }),
    )
    expect(r.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const r = await POST(req(''))
    expect(r.status).toBe(401)
  })

  it('rejects invalid body', async () => {
    const { cookie } = await bootCtx()
    const r = await POST(req(cookie, { bad: 'payload' }))
    expect(r.status).toBe(400)
  })

  it('rejects when caregiver lacks pay_food_orders permission', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    repo.createPairing({
      elderId: elder.id,
      caregiverId: cg.id,
      isPrimary: false,
      permissions: { ...DEFAULT_PRIMARY_PERMISSIONS, pay_food_orders: false },
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await POST(req(cookie, { elderId: elder.id, eventId: 'ev1', menu: validMenu }))
    expect(r.status).toBe(403)
  })

  it('creates order and returns id + status + total', async () => {
    const { cookie, elderId } = await bootCtx()
    const r = await POST(req(cookie, { elderId, eventId: 'ev1', menu: validMenu }))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.id).toBeTruthy()
    expect(body.status).toBe('pending')
    expect(body.total).toBe(85)
  })
})
