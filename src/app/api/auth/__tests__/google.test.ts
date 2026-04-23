/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET as googleHandler } from '../google/route'
import { POST as callbackHandler } from '../google/callback/route'

const ORIGIN = 'http://localhost:3000'

function getRequest(url: string) {
  return new NextRequest(url, {
    method: 'GET',
    headers: { origin: ORIGIN, host: 'localhost:3000' },
  })
}

function postRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      host: 'localhost:3000',
    },
    body: JSON.stringify(body),
  })
}

describe('GET /api/auth/google', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      GOOGLE_CLIENT_ID: 'test-client-id',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('redirects to Google OAuth URL', async () => {
    const res = await googleHandler(getRequest('http://localhost:3000/api/auth/google'))
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth')
  })

  it('includes required OAuth params in redirect URL', async () => {
    const res = await googleHandler(getRequest('http://localhost:3000/api/auth/google'))
    const location = new URL(res.headers.get('location') ?? '')
    expect(location.searchParams.get('client_id')).toBe('test-client-id')
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/auth/callback',
    )
    expect(location.searchParams.get('scope')).toContain('email')
    expect(location.searchParams.get('scope')).toContain('profile')
    expect(location.searchParams.get('response_type')).toBe('code')
  })
})

describe('POST /api/auth/google/callback', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = OLD_ENV
    jest.restoreAllMocks()
  })

  it('returns 400 when code is missing', async () => {
    const res = await callbackHandler(
      postRequest('http://localhost:3000/api/auth/google/callback', {}),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns user data on valid code', async () => {
    global.fetch = jest
      .fn()
      // First call: token exchange
      .mockResolvedValueOnce({
        json: async () => ({ access_token: 'ACCESS_TOKEN' }),
      } as Response)
      // Second call: userinfo
      .mockResolvedValueOnce({
        json: async () => ({
          email: 'test@gmail.com',
          given_name: 'สมชาย',
          family_name: 'ใจดี',
          name: 'สมชาย ใจดี',
          picture: 'https://example.com/pic.jpg',
        }),
      } as Response)

    const res = await callbackHandler(
      postRequest('http://localhost:3000/api/auth/google/callback', {
        code: 'valid-auth-code',
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('test@gmail.com')
    expect(body.firstName).toBe('สมชาย')
    expect(body.lastName).toBe('ใจดี')
    expect(body.name).toBe('สมชาย ใจดี')
    expect(body.picture).toBeTruthy()
  })

  it('returns 400 when Google token exchange fails', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Code already used',
      }),
    } as Response)

    const res = await callbackHandler(
      postRequest('http://localhost:3000/api/auth/google/callback', {
        code: 'expired-code',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Code already used')
  })

  it('returns 500 when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

    const res = await callbackHandler(
      postRequest('http://localhost:3000/api/auth/google/callback', {
        code: 'any-code',
      }),
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })
})
