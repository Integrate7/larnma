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
import { GET as listEvents } from '../route'
import { GET as streamEvents } from '../stream/route'

function req(url: string, cookie?: string) {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

async function bootCaregiverCtx() {
  const repo = getRepository()
  const cg = repo.createUser({
    role: 'caregiver',
    phone: '0811',
    name: 'CG',
  })
  const elder = repo.createUser({
    role: 'elder',
    phone: '0822',
    name: 'ย่า',
  })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    caregiverId: cg.id,
    elderId: elder.id,
  }
}

describe('/api/events', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('GET list rejects unauth', async () => {
    const r = await listEvents(req('http://localhost:3000/api/events'))
    expect(r.status).toBe(401)
  })

  it('GET list returns events + notifications', async () => {
    const ctx = await bootCaregiverCtx()
    const repo = getRepository()
    repo.createAudioEvent({
      elderId: ctx.elderId,
      transcript: 'x',
      mood: 'HUNGRY',
      intent: 'HUNGRY',
      confidence: 0.9,
      summary: 's',
      entities: {},
    })
    const res = await listEvents(
      req('http://localhost:3000/api/events', ctx.cookie),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toHaveLength(1)
    expect(body.notifications).toBeDefined()
  })

  it('stream rejects unauth', async () => {
    const r = await streamEvents(
      req('http://localhost:3000/api/events/stream'),
    )
    expect(r.status).toBe(401)
  })

  it('stream returns SSE text stream for auth caregiver', async () => {
    const ctx = await bootCaregiverCtx()
    const res = await streamEvents(
      req('http://localhost:3000/api/events/stream', ctx.cookie),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    // Read the first "hello" heartbeat to make sure it writes
    const reader = res.body?.getReader()
    if (!reader) throw new Error('no body')
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    expect(text).toContain('heartbeat')
    await reader.cancel()
  })
})
