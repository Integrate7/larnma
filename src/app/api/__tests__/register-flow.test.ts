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
import { POST as createElder } from '../elders/route'
import {
  GET as getElder,
  PATCH as patchElder,
  DELETE as delElder,
} from '../elders/[id]/route'
import { POST as createConsents } from '../consents/route'
import { POST as createQr } from '../pairings/qr/route'
import { POST as consumePairing } from '../pairings/consume/route'
import { GET as getMe, PATCH as patchMe } from '../caregivers/me/route'

const ORIGIN = 'http://localhost:3000'

type Ctx = {
  cookie: string
  caregiverId: string
}

async function bootCaregiverSession(name = 'CG'): Promise<Ctx> {
  const repo = getRepository()
  const user = repo.createUser({ role: 'caregiver', phone: '0899999999', name })
  const s = await issueCaregiverSession({ userId: user.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    caregiverId: user.id,
  }
}

function req(
  url: string,
  opts: {
    method?: string
    body?: unknown
    cookie?: string
    origin?: string
  } = {},
) {
  return new NextRequest(url, {
    method: opts.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      origin: opts.origin ?? ORIGIN,
      host: 'localhost:3000',
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
}

const ELDER_BODY = {
  basic: {
    name: 'ย่า',
    phone: '0899999998',
    addressLine: 'บ้านเลขที่ 1',
    district: 'เมือง',
    province: 'กทม',
    postalCode: '10100',
  },
  health: { conditions: ['เบาหวาน'], symptoms: [], medications: [], allergies: [] },
  emergency: {},
  optional: { foodPreferences: ['ข้าวผัด'], foodDislikes: ['อาหารหวาน'] },
}

describe('caregiver/me', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('GET rejects unauth', async () => {
    const r = await getMe(
      req('http://localhost:3000/api/caregivers/me', { method: 'GET' }),
    )
    expect(r.status).toBe(401)
  })

  it('GET returns user when authed', async () => {
    const ctx = await bootCaregiverSession()
    const r = await getMe(
      req('http://localhost:3000/api/caregivers/me', {
        method: 'GET',
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.id).toBe(ctx.caregiverId)
  })

  it('PATCH updates name + rejects unauth + rejects bad body', async () => {
    const unauth = await patchMe(
      req('http://localhost:3000/api/caregivers/me', {
        method: 'PATCH',
        body: { name: 'X' },
      }),
    )
    expect(unauth.status).toBe(401)

    const ctx = await bootCaregiverSession()
    const ok = await patchMe(
      req('http://localhost:3000/api/caregivers/me', {
        method: 'PATCH',
        body: { name: 'New' },
        cookie: ctx.cookie,
      }),
    )
    const body = await ok.json()
    expect(body.name).toBe('New')

    const bad = await patchMe(
      req('http://localhost:3000/api/caregivers/me', {
        method: 'PATCH',
        body: {},
        cookie: ctx.cookie,
      }),
    )
    expect(bad.status).toBe(400)
  })
})

describe('elders creation + get/patch/delete', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('rejects unauth', async () => {
    const r = await createElder(
      req('http://localhost:3000/api/elders', { body: ELDER_BODY }),
    )
    expect(r.status).toBe(401)
  })

  it('creates elder + profile + primary pairing', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createElder(
      req('http://localhost:3000/api/elders', {
        body: ELDER_BODY,
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(201)
    const { id } = await r.json()
    const get = await getElder(
      req(`http://localhost:3000/api/elders/${id}`, {
        method: 'GET',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    const elder = await get.json()
    expect(elder.name).toBe('ย่า')
    expect(elder.conditions).toContain('เบาหวาน')
  })

  it('rejects malformed body', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createElder(
      req('http://localhost:3000/api/elders', {
        body: { oops: true },
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(400)
  })

  it('PATCH updates when caregiver has edit permission', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createElder(
      req('http://localhost:3000/api/elders', {
        body: ELDER_BODY,
        cookie: ctx.cookie,
      }),
    )
    const { id } = await r.json()
    const patched = await patchElder(
      req(`http://localhost:3000/api/elders/${id}`, {
        method: 'PATCH',
        body: { section: 'basic', fields: { addressLine: 'บ้านใหม่' } },
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    const body = await patched.json()
    expect(body.addressLine).toBe('บ้านใหม่')
  })

  it('PATCH forbidden without permission', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createElder(
      req('http://localhost:3000/api/elders', {
        body: ELDER_BODY,
        cookie: ctx.cookie,
      }),
    )
    const { id } = await r.json()
    const repo = getRepository()
    const pairing = repo.getPairingByPair(id, ctx.caregiverId)
    if (pairing)
      repo.updatePairing(pairing.id, {
        permissions: { ...pairing.permissions, edit_elder_profile: false },
      })
    const res = await patchElder(
      req(`http://localhost:3000/api/elders/${id}`, {
        method: 'PATCH',
        body: { section: 'basic', fields: { addressLine: 'x' } },
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(403)
  })

  it('GET forbidden when not paired', async () => {
    const ctx = await bootCaregiverSession()
    const res = await getElder(
      req('http://localhost:3000/api/elders/unknown-id', {
        method: 'GET',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id: 'unknown-id' }) },
    )
    expect(res.status).toBe(403)
  })

  it('DELETE soft-deletes when Primary', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createElder(
      req('http://localhost:3000/api/elders', {
        body: ELDER_BODY,
        cookie: ctx.cookie,
      }),
    )
    const { id } = await r.json()
    const del = await delElder(
      req(`http://localhost:3000/api/elders/${id}`, {
        method: 'DELETE',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id }) },
    )
    expect(del.status).toBe(200)
    const profile = getRepository().getElderProfile(id)
    expect(profile?.deletedAt).toBeTruthy()
    expect(profile?.hardDeleteAfter).toBeTruthy()
  })

  it('DELETE forbidden when not Primary', async () => {
    const ctx = await bootCaregiverSession()
    const res = await delElder(
      req('http://localhost:3000/api/elders/unknown-id', {
        method: 'DELETE',
        cookie: ctx.cookie,
      }),
      { params: Promise.resolve({ id: 'unknown-id' }) },
    )
    expect(res.status).toBe(403)
  })
})

describe('consents', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('requires audio_ai + health_data granted', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createConsents(
      req('http://localhost:3000/api/consents', {
        body: {
          items: [
            { type: 'audio_ai', granted: false },
            { type: 'health_data', granted: true },
          ],
        },
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(400)
  })

  it('records consents happy path', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createConsents(
      req('http://localhost:3000/api/consents', {
        body: {
          items: [
            { type: 'audio_ai', granted: true },
            { type: 'health_data', granted: true },
            { type: 'marketing', granted: false },
          ],
        },
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.count).toBe(3)
  })

  it('rejects invalid body', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createConsents(
      req('http://localhost:3000/api/consents', {
        body: { items: [] },
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(400)
  })

  it('rejects unauth', async () => {
    const r = await createConsents(
      req('http://localhost:3000/api/consents', {
        body: {
          items: [
            { type: 'audio_ai', granted: true },
            { type: 'health_data', granted: true },
          ],
        },
      }),
    )
    expect(r.status).toBe(401)
  })
})

describe('pairings QR + consume', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('generates QR + consume flow', async () => {
    const ctx = await bootCaregiverSession()
    const created = await createElder(
      req('http://localhost:3000/api/elders', {
        body: ELDER_BODY,
        cookie: ctx.cookie,
      }),
    )
    const { id } = await created.json()
    const qr = await createQr(
      req('http://localhost:3000/api/pairings/qr', {
        body: { elderId: id },
        cookie: ctx.cookie,
      }),
    )
    const body = await qr.json()
    expect(body.token).toBeTruthy()
    expect(body.qrDataUrl).toContain('data:image/png')

    const consume = await consumePairing(
      req('http://localhost:3000/api/pairings/consume', {
        body: { token: body.token, deviceFingerprint: 'fp-1' },
      }),
    )
    expect(consume.status).toBe(200)
    expect(consume.headers.get('set-cookie')).toContain(COOKIES.device)
  })

  it('rejects QR when not Primary', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createQr(
      req('http://localhost:3000/api/pairings/qr', {
        body: { elderId: 'unknown' },
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(403)
  })

  it('rejects QR with invalid body', async () => {
    const ctx = await bootCaregiverSession()
    const r = await createQr(
      req('http://localhost:3000/api/pairings/qr', {
        body: {},
        cookie: ctx.cookie,
      }),
    )
    expect(r.status).toBe(400)
  })

  it('consume rejects invalid token', async () => {
    const r = await consumePairing(
      req('http://localhost:3000/api/pairings/consume', {
        body: { token: 'garbage', deviceFingerprint: 'fp' },
      }),
    )
    expect(r.status).toBe(401)
  })

  it('consume rejects missing body', async () => {
    const r = await consumePairing(
      req('http://localhost:3000/api/pairings/consume', { body: {} }),
    )
    expect(r.status).toBe(400)
  })
})
