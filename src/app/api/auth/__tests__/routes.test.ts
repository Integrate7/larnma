/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { POST as sendHandler } from '../otp/send/route'
import { POST as verifyHandler } from '../otp/verify/route'
import { POST as logoutHandler } from '../logout/route'
import { POST as refreshHandler } from '../refresh/route'
import { COOKIES } from '@/services/jwt'
import { MOCK_OTP_CODE } from '@/services/otp'

const ORIGIN = 'http://localhost:3000'

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      host: 'localhost:3000',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('auth API routes', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('sends OTP with valid phone', async () => {
    const res = await sendHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/send', {
        phone: '0812345678',
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ref).toBeTruthy()
  })

  it('rejects send OTP cross-origin', async () => {
    const req = jsonRequest(
      'http://localhost:3000/api/auth/otp/send',
      { phone: '0812345678' },
      { origin: 'http://evil.example' },
    )
    const res = await sendHandler(req)
    expect(res.status).toBe(403)
  })

  it('rejects send OTP with invalid body', async () => {
    const res = await sendHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/send', {
        phone: 'abc',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('verify OTP happy path sets cookies and creates user', async () => {
    const sr = await sendHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/send', {
        phone: '0812345678',
      }),
    )
    const { ref } = await sr.json()
    const res = await verifyHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/verify', {
        phone: '0812345678',
        code: MOCK_OTP_CODE,
        ref,
      }),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.userId).toBeTruthy()
    expect(res.headers.get('set-cookie')).toContain(COOKIES.access)
    // existing user path
    const sr2 = await sendHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/send', {
        phone: '0812345678',
      }),
    )
    const { ref: ref2 } = await sr2.json()
    const res2 = await verifyHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/verify', {
        phone: '0812345678',
        code: MOCK_OTP_CODE,
        ref: ref2,
      }),
    )
    const body2 = await res2.json()
    expect(body2.userId).toBe(body.userId)
  })

  it('verify OTP rejects wrong code', async () => {
    const sr = await sendHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/send', {
        phone: '0812345678',
      }),
    )
    const { ref } = await sr.json()
    const res = await verifyHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/verify', {
        phone: '0812345678',
        code: '000000',
        ref,
      }),
    )
    expect(res.status).toBe(401)
  })

  it('verify OTP rejects malformed body', async () => {
    const res = await verifyHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/verify', {
        phone: '0811',
        code: '1',
        ref: '',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('logout clears cookies', async () => {
    const res = await logoutHandler(
      new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { origin: ORIGIN, host: 'localhost:3000' },
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('refresh rejects when no cookie', async () => {
    const res = await refreshHandler(
      new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { origin: ORIGIN, host: 'localhost:3000' },
      }),
    )
    expect(res.status).toBe(401)
  })

  it('refresh works after valid OTP verify', async () => {
    const sr = await sendHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/send', {
        phone: '0812345678',
      }),
    )
    const { ref } = await sr.json()
    const vRes = await verifyHandler(
      jsonRequest('http://localhost:3000/api/auth/otp/verify', {
        phone: '0812345678',
        code: MOCK_OTP_CODE,
        ref,
      }),
    )
    const cookieHeader = vRes.headers.getSetCookie().join('; ')
    const refreshMatch = cookieHeader.match(
      new RegExp(`${COOKIES.refresh}=([^;]+)`),
    )
    if (!refreshMatch) throw new Error('no refresh cookie')
    const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        origin: ORIGIN,
        host: 'localhost:3000',
        cookie: `${COOKIES.refresh}=${refreshMatch[1]}`,
      },
    })
    const res = await refreshHandler(req)
    expect(res.status).toBe(200)
  })

  it('refresh rejects bad cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        origin: ORIGIN,
        host: 'localhost:3000',
        cookie: `${COOKIES.refresh}=garbage`,
      },
    })
    const res = await refreshHandler(req)
    expect(res.status).toBe(401)
  })

  it('rejects verify/refresh/logout cross-origin', async () => {
    const badOrigin = { origin: 'http://evil.example' }
    for (const handler of [verifyHandler, refreshHandler, logoutHandler]) {
      const req = new NextRequest('http://localhost:3000/api/auth/x', {
        method: 'POST',
        headers: { ...badOrigin, host: 'localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify({ phone: '0812345678', code: '123456', ref: 'r' }),
      })
      const res = await handler(req)
      expect(res.status).toBe(403)
    }
  })

  it('uses the repo singleton', () => {
    // quick sanity — ensure tests share the same repo instance through the reset
    expect(getRepository()).toBeTruthy()
  })
})
