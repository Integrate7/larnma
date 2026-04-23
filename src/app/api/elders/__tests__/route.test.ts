/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { POST } from '../route'

const ORIGIN = 'http://localhost:3000'

const validBody = {
  basic: {
    name: 'ย่า',
    phone: '0822222222',
    addressLine: '1 ถนนสุขุมวิท',
    district: 'คลองเตย',
    province: 'กรุงเทพมหานคร',
    postalCode: '10110',
  },
  health: {
    conditions: [],
    symptoms: [],
    medications: [],
    allergies: [],
  },
  emergency: {
    hospitalContact: { name: 'โรงพยาบาล', phone: '022222222' },
    doctorContact: { name: 'นพ.สมชาย', phone: '022222223' },
    backupRelative: { name: 'ลูก', phone: '0811111111' },
  },
}

function req(cookie: string, body?: unknown) {
  return new NextRequest(`${ORIGIN}/api/elders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      cookie,
    },
    body: JSON.stringify(body ?? validBody),
  })
}

describe('POST /api/elders', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects cross-origin requests', async () => {
    const r = await POST(
      new NextRequest(`${ORIGIN}/api/elders`, {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'https://evil.com', 'content-type': 'application/json' },
        body: JSON.stringify(validBody),
      }),
    )
    expect(r.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const r = await POST(req(''))
    expect(r.status).toBe(401)
  })

  it('rejects invalid body', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req(`${COOKIES.access}=${s.accessToken}`, { bad: 'payload' }))
    expect(r.status).toBe(400)
  })

  it('creates elder and pairing, returns 201', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await POST(req(`${COOKIES.access}=${s.accessToken}`))
    expect(r.status).toBe(201)
    const body = await r.json()
    expect(body.id).toBeTruthy()
    const pairing = repo.getPairingByPair(body.id, cg.id)
    expect(pairing?.isPrimary).toBe(true)
  })
})
