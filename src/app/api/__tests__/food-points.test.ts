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
import { GET as menusHandler } from '../menus/route'
import { POST as ordersHandler } from '../orders/route'
import { POST as payHandler } from '../orders/[id]/pay/route'
import { POST as advanceHandler } from '../orders/[id]/advance/route'
import { GET as pointsHandler } from '../points/me/route'

const ORIGIN = 'http://localhost:3000'

function req(
  url: string,
  opts: {
    method?: string
    body?: unknown
    cookie?: string
  } = {},
) {
  return new NextRequest(url, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function boot(permissions = DEFAULT_PRIMARY_PERMISSIONS) {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'E' })
  repo.createElderProfile({
    userId: elder.id,
    addressLine: 'a',
    district: 'd',
    province: 'p',
    postalCode: '10100',
    conditions: ['เบาหวาน'],
    symptoms: [],
    medications: [],
    allergies: ['กุ้ง'],
    foodPreferences: [],
    foodDislikes: [],
  })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    caregiverId: cg.id,
    elderId: elder.id,
  }
}

describe('food + points API', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('menus rejects unauth', async () => {
    const r = await menusHandler(req('http://localhost:3000/api/menus'))
    expect(r.status).toBe(401)
  })

  it('menus filters by elder conditions + allergies', async () => {
    const ctx = await boot()
    const r = await menusHandler(
      req(
        `http://localhost:3000/api/menus?elderId=${ctx.elderId}`,
        { cookie: ctx.cookie },
      ),
    )
    const body = await r.json()
    const names = (body.items as Array<{ name: string }>).map((i) => i.name)
    expect(names).not.toContain('ขนมหวาน')
    expect(names.every((n) => !n.includes('กุ้ง'))).toBe(true)
  })

  it('orders create + pay + advance → delivered, points awarded', async () => {
    const ctx = await boot()
    const created = await ordersHandler(
      req('http://localhost:3000/api/orders', {
        method: 'POST',
        cookie: ctx.cookie,
        body: {
          elderId: ctx.elderId,
          eventId: 'ev',
          menu: [{ name: 'ข้าวผัด', price: 85, qty: 1 }],
        },
      }),
    )
    const { id } = await created.json()
    const pay = await payHandler(
      req(`http://localhost:3000/api/orders/${id}/pay`, {
        method: 'POST',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    const paid = await pay.json()
    expect(paid.status).toBe('paid')

    // Advance through remaining steps
    for (const expect_status of ['preparing', 'delivering', 'delivered']) {
      const r = await advanceHandler(
        req(`http://localhost:3000/api/orders/${id}/advance`, {
          method: 'POST',
          cookie: ctx.cookie,
        }),
        { params: Promise.resolve({ id }) },
      )
      const b = await r.json()
      expect(b.status).toBe(expect_status)
    }

    const points = await pointsHandler(
      req('http://localhost:3000/api/points/me', { cookie: ctx.cookie }),
    )
    const pbody = await points.json()
    expect(pbody.balance).toBeGreaterThan(0)
    expect(pbody.history).toHaveLength(1)
  })

  it('pay rejects twice', async () => {
    const ctx = await boot()
    const created = await ordersHandler(
      req('http://localhost:3000/api/orders', {
        method: 'POST',
        cookie: ctx.cookie,
        body: {
          elderId: ctx.elderId,
          eventId: 'ev',
          menu: [{ name: 'x', price: 1, qty: 1 }],
        },
      }),
    )
    const { id } = await created.json()
    await payHandler(
      req(`http://localhost:3000/api/orders/${id}/pay`, {
        method: 'POST',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    const second = await payHandler(
      req(`http://localhost:3000/api/orders/${id}/pay`, {
        method: 'POST',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    expect(second.status).toBe(409)
  })

  it('orders create forbidden without pay permission', async () => {
    const ctx = await boot({
      ...DEFAULT_PRIMARY_PERMISSIONS,
      pay_food_orders: false,
    })
    const r = await ordersHandler(
      req('http://localhost:3000/api/orders', {
        method: 'POST',
        cookie: ctx.cookie,
        body: {
          elderId: ctx.elderId,
          eventId: 'ev',
          menu: [{ name: 'x', price: 1, qty: 1 }],
        },
      }),
    )
    expect(r.status).toBe(403)
  })

  it('orders rejects invalid body', async () => {
    const ctx = await boot()
    const r = await ordersHandler(
      req('http://localhost:3000/api/orders', {
        method: 'POST',
        cookie: ctx.cookie,
        body: { oops: true },
      }),
    )
    expect(r.status).toBe(400)
  })

  it('pay 404 on unknown order', async () => {
    const ctx = await boot()
    const r = await payHandler(
      req('http://localhost:3000/api/orders/missing/pay', {
        method: 'POST',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id: 'missing' }) },
    )
    expect(r.status).toBe(404)
  })

  it('points rejects unauth', async () => {
    const r = await pointsHandler(req('http://localhost:3000/api/points/me'))
    expect(r.status).toBe(401)
  })
})
