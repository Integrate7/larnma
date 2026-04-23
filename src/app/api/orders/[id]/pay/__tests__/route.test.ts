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

function req(id: string, cookie?: string) {
  return new NextRequest(`${ORIGIN}/api/orders/${id}/pay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
  })
}

async function bootWithPendingOrder() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
  const order = repo.createOrder({
    eventId: 'ev1',
    caregiverId: cg.id,
    elderId: elder.id,
    menu: [{ name: 'ข้าวผัด', price: 85, qty: 1 }],
    total: 85,
    status: 'pending',
    mockRef: 'm',
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, orderId: order.id, cgId: cg.id }
}

describe('POST /api/orders/[id]/pay', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await POST(
      new NextRequest(`${ORIGIN}/api/orders/x/pay`, {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'https://evil.com' },
      }),
      { params: Promise.resolve({ id: 'x' }) },
    )
    expect(r.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const r = await POST(req('x'), { params: Promise.resolve({ id: 'x' }) })
    expect(r.status).toBe(401)
  })

  it('returns 404 for unknown order', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req('nope', `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: 'nope' }) })
    expect(r.status).toBe(404)
  })

  it('returns 403 when caregiver does not own the order', async () => {
    const repo = getRepository()
    const cg1 = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG1' })
    const cg2 = repo.createUser({ role: 'caregiver', phone: '0822', name: 'CG2' })
    const elder = repo.createUser({ role: 'elder', phone: '0833', name: 'ย่า' })
    const order = repo.createOrder({ eventId: 'ev', caregiverId: cg1.id, elderId: elder.id, menu: [], total: 0, status: 'pending', mockRef: 'm' })
    const s = await issueCaregiverSession({ userId: cg2.id })
    const r = await POST(req(order.id, `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: order.id }) })
    expect(r.status).toBe(403)
  })

  it('returns 409 when order is already paid', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    const order = repo.createOrder({ eventId: 'ev', caregiverId: cg.id, elderId: elder.id, menu: [], total: 0, status: 'paid', mockRef: 'm' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req(order.id, `${COOKIES.access}=${s.accessToken}`), { params: Promise.resolve({ id: order.id }) })
    expect(r.status).toBe(409)
  })

  it('advances pending order to paid', async () => {
    const { cookie, orderId } = await bootWithPendingOrder()
    const r = await POST(req(orderId, cookie), { params: Promise.resolve({ id: orderId }) })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.status).toBe('paid')
  })
})
