/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueDeviceSession } from '@/services/auth'
import { resetEventBus, subscribe } from '@/services/eventBus'
import { COOKIES } from '@/services/jwt'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { POST } from '../route'

function seedElderWithCaregivers() {
  const repo = getRepository()
  const elder = repo.createUser({
    role: 'elder',
    phone: '0888',
    name: 'ย่า',
  })
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
  const c1 = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C1' })
  const c2 = repo.createUser({ role: 'caregiver', phone: '0822', name: 'C2' })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: c1.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: c2.id,
    isPrimary: false,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  return { elderId: elder.id, c1Id: c1.id, c2Id: c2.id }
}

function jsonReq(body: unknown, cookie: string) {
  return new NextRequest('http://localhost:3000/api/audio', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      cookie,
    },
    body: JSON.stringify(body),
  })
}

describe('/api/audio', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
    resetEventBus()
  })

  it('rejects without device cookie', async () => {
    const r = await POST(
      new NextRequest('http://localhost:3000/api/audio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
    )
    expect(r.status).toBe(401)
  })

  it('processes HUNGRY keyword + fans out + publishes audio bus event', async () => {
    const { elderId, c1Id, c2Id } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const cookie = `${COOKIES.device}=${s.token}`
    const received: string[] = []
    subscribe(c1Id, (e) => received.push(e.kind))
    subscribe(c2Id, (e) => received.push(e.kind))
    const r = await POST(jsonReq({ hintKeyword: 'หิว' }, cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.mood).toBe('HUNGRY')
    // Both caregivers get an 'audio' event; Primary gets a 'notification' for normal priority too
    expect(received.filter((k) => k === 'audio')).toHaveLength(2)
    expect(received.filter((k) => k === 'notification')).toHaveLength(2)
  })

  it('HAPPY does not fan out notifications', async () => {
    const { elderId, c1Id } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const received: string[] = []
    subscribe(c1Id, (e) => received.push(e.kind))
    const r = await POST(
      jsonReq({ hintKeyword: 'วันนี้สบายดี' }, `${COOKIES.device}=${s.token}`),
    )
    const body = await r.json()
    expect(body.mood).toBe('HAPPY')
    expect(received.filter((k) => k === 'notification')).toHaveLength(0)
  })

  it('handles empty body gracefully', async () => {
    const { elderId } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const r = await POST(
      new NextRequest('http://localhost:3000/api/audio', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          host: 'localhost:3000',
          cookie: `${COOKIES.device}=${s.token}`,
        },
        body: 'not json',
      }),
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.mood).toBe('NORMAL')
  })

  it('processes form-data body with fakeKeyword', async () => {
    const { elderId } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const form = new FormData()
    form.append('fakeKeyword', 'หิวข้าว')
    const r = await POST(
      new NextRequest('http://localhost:3000/api/audio', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          cookie: `${COOKIES.device}=${s.token}`,
        },
        body: form,
      }),
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(['HUNGRY', 'NORMAL']).toContain(body.mood)
  })

  it('processes form-data with formData parse failure gracefully', async () => {
    const { elderId } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const r = await POST(
      new NextRequest('http://localhost:3000/api/audio', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
          host: 'localhost:3000',
          cookie: `${COOKIES.device}=${s.token}`,
        },
        body: 'raw text',
      }),
    )
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ mood: expect.any(String) })
  })

  it('JSON body without hintKeyword field falls back to empty string', async () => {
    const { elderId } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const r = await POST(jsonReq({}, `${COOKIES.device}=${s.token}`))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ mood: expect.any(String) })
  })

  it('form-data without fakeKeyword field falls back to empty string', async () => {
    const { elderId } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const form = new FormData()
    const r = await POST(
      new NextRequest('http://localhost:3000/api/audio', {
        method: 'POST',
        headers: { host: 'localhost:3000', cookie: `${COOKIES.device}=${s.token}` },
        body: form,
      }),
    )
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ mood: expect.any(String) })
  })

  it('no content-type header falls through to formData path', async () => {
    const { elderId } = seedElderWithCaregivers()
    const s = await issueDeviceSession({ elderId, fingerprint: 'fp' })
    const r = await POST(
      new NextRequest('http://localhost:3000/api/audio', {
        method: 'POST',
        headers: { host: 'localhost:3000', cookie: `${COOKIES.device}=${s.token}` },
        body: null,
      }),
    )
    expect(r.status).toBe(200)
  })

  it('HUNGRY with no elder profile uses empty sets for conditions', async () => {
    const repo = getRepository()
    const elder = repo.createUser({ role: 'elder', phone: '0777', name: 'ย่า' })
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
    const r = await POST(jsonReq({ hintKeyword: 'หิว' }, `${COOKIES.device}=${s.token}`))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.mood).toBe('HUNGRY')
  })

  it('HUNGRY with elder health conditions filters menu suggestions', async () => {
    const repo = getRepository()
    const elder = repo.createUser({ role: 'elder', phone: '0999', name: 'ย่า' })
    repo.createElderProfile({
      userId: elder.id,
      conditions: ['เบาหวาน'],
      symptoms: [],
      medications: [],
      allergies: ['กุ้ง'],
      foodPreferences: [],
      foodDislikes: [],
      addressLine: '1 ถนน',
      district: 'เขต',
      province: 'กรุงเทพ',
      postalCode: '10000',
    })
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    repo.createPairing({ elderId: elder.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
    const r = await POST(jsonReq({ hintKeyword: 'หิว' }, `${COOKIES.device}=${s.token}`))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.mood).toBe('HUNGRY')
  })
})
