/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server'
import {
  COOKIES,
  clearSessionCookie,
  readCookie,
  setSessionCookie,
} from '../cookieSession'

describe('cookieSession', () => {
  it('exposes cookie names', () => {
    expect(COOKIES.access).toBeTruthy()
    expect(COOKIES.refresh).toBeTruthy()
    expect(COOKIES.device).toBeTruthy()
  })

  it('sets cookie with HttpOnly + SameSite=lax', () => {
    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, 'test', 'value', { maxAgeSec: 60 })
    const header = res.headers.get('set-cookie') ?? ''
    expect(header).toContain('HttpOnly')
    expect(header.toLowerCase()).toContain('samesite=lax')
    expect(header).toContain('Max-Age=60')
  })

  it('clearSessionCookie sets Max-Age=0', () => {
    const res = NextResponse.json({ ok: true })
    clearSessionCookie(res, 'test')
    const header = res.headers.get('set-cookie') ?? ''
    expect(header).toContain('Max-Age=0')
  })

  it('readCookie reads from NextRequest-like shape', () => {
    const fakeReq = {
      cookies: {
        get: (name: string) =>
          name === 'x' ? { value: 'v' } : undefined,
      },
    } as any
    expect(readCookie(fakeReq, 'x')).toBe('v')
    expect(readCookie(fakeReq, 'missing')).toBeUndefined()
  })
})
