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
import { POST } from '../route'

const ORIGIN = 'http://localhost:3000'

function req(cookie: string, id: string) {
  return new NextRequest(`http://localhost:3000/api/notifications/${id}/ack`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      cookie,
    },
    body: '{}',
  })
}

describe('/api/notifications/:id/ack', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('rejects unauth', async () => {
    const r = await POST(req('', 'x'), { params: Promise.resolve({ id: 'x' }) })
    expect(r.status).toBe(401)
  })

  it('404 on unknown notification', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(
      req(`${COOKIES.access}=${s.accessToken}`, 'nope'),
      { params: Promise.resolve({ id: 'nope' }) },
    )
    expect(r.status).toBe(404)
  })

  it('403 when notification belongs to another caregiver', async () => {
    const repo = getRepository()
    const cg1 = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C1' })
    const cg2 = repo.createUser({ role: 'caregiver', phone: '0822', name: 'C2' })
    const noti = repo.createNotification({
      eventId: 'ev',
      caregiverId: cg1.id,
      priority: 'critical',
    })
    const s = await issueCaregiverSession({ userId: cg2.id })
    const r = await POST(
      req(`${COOKIES.access}=${s.accessToken}`, noti.id),
      { params: Promise.resolve({ id: noti.id }) },
    )
    expect(r.status).toBe(403)
  })

  it('happy path: first caller locks + ack', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C' })
    const noti = repo.createNotification({
      eventId: 'ev',
      caregiverId: cg.id,
      priority: 'critical',
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(
      req(`${COOKIES.access}=${s.accessToken}`, noti.id),
      { params: Promise.resolve({ id: noti.id }) },
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.locked).toBe(true)
    expect(body.lockedByCaregiverId).toBe(cg.id)
  })

  it('re-ack by same caregiver remains locked=true', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C' })
    const noti = repo.createNotification({
      eventId: 'ev',
      caregiverId: cg.id,
      priority: 'critical',
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const first = await POST(
      req(`${COOKIES.access}=${s.accessToken}`, noti.id),
      { params: Promise.resolve({ id: noti.id }) },
    )
    expect(first.status).toBe(200)
    const second = await POST(
      req(`${COOKIES.access}=${s.accessToken}`, noti.id),
      { params: Promise.resolve({ id: noti.id }) },
    )
    const body = await second.json()
    expect(body.locked).toBe(true)
  })
})
