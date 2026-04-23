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
import { MOCK_OTP_CODE, sendOtp } from '@/services/otp'
import {
  DEFAULT_PRIMARY_PERMISSIONS,
  DEFAULT_SECONDARY_PERMISSIONS,
} from '@/shared/types'
import { POST as createInvite } from '../invites/route'
import {
  GET as getInvite,
} from '../invites/[token]/route'
import { POST as acceptInvite } from '../invites/[token]/accept/route'
import { PATCH as patchPermissions } from '../pairings/[id]/permissions/route'

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
    method: opts.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: ORIGIN,
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

describe('invite + permissions API', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('create invite requires Primary pairing', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await createInvite(
      req('http://localhost:3000/api/invites', {
        body: { elderId: 'nope' },
        cookie: `${COOKIES.access}=${s.accessToken}`,
      }),
    )
    expect(r.status).toBe(403)
  })

  it('full invite lifecycle: create → landing → accept', async () => {
    const repo = getRepository()
    const primary = repo.createUser({
      role: 'caregiver',
      phone: '0811',
      name: 'Primary',
    })
    const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
    repo.createPairing({
      elderId: elder.id,
      caregiverId: primary.id,
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    const pSession = await issueCaregiverSession({ userId: primary.id })

    const invRes = await createInvite(
      req('http://localhost:3000/api/invites', {
        body: { elderId: elder.id },
        cookie: `${COOKIES.access}=${pSession.accessToken}`,
      }),
    )
    expect(invRes.status).toBe(200)
    const inv = await invRes.json()
    expect(inv.token).toBeTruthy()

    // Landing
    const landing = await getInvite(
      req(`http://localhost:3000/api/invites/${inv.token}`, { method: 'GET' }),
      { params: Promise.resolve({ token: inv.token }) },
    )
    const landingBody = await landing.json()
    expect(landingBody.elderName).toBe('ย่า')
    expect(landingBody.inviterName).toBe('Primary')

    // Accept — need OTP first
    const otpRes = await sendOtp('0899999999')
    if (!otpRes.success) throw new Error('OTP send failed')

    const accept = await acceptInvite(
      req(`http://localhost:3000/api/invites/${inv.token}/accept`, {
        method: 'POST',
        body: {
          phone: '0899999999',
          code: MOCK_OTP_CODE,
          ref: otpRes.ref,
          name: 'Secondary',
        },
      }),
      { params: Promise.resolve({ token: inv.token }) },
    )
    expect(accept.status).toBe(200)
    const pair = repo.listPairingsByElder(elder.id)
    expect(pair).toHaveLength(2)
    expect(pair.some((p) => !p.isPrimary)).toBe(true)
  })

  it('accept rejects invalid token', async () => {
    const otp = await sendOtp('0899999999')
    if (!otp.success) throw new Error('OTP send failed')
    const r = await acceptInvite(
      req('http://localhost:3000/api/invites/bad/accept', {
        body: {
          phone: '0899999999',
          code: MOCK_OTP_CODE,
          ref: otp.ref,
          name: 'x',
        },
      }),
      { params: Promise.resolve({ token: 'bad' }) },
    )
    expect(r.status).toBe(401)
  })

  it('landing 401 on garbage token', async () => {
    const r = await getInvite(
      req('http://localhost:3000/api/invites/bad', { method: 'GET' }),
      { params: Promise.resolve({ token: 'bad' }) },
    )
    expect(r.status).toBe(401)
  })

  it('permissions PATCH: Primary can toggle Secondary, not own Primary pairing', async () => {
    const repo = getRepository()
    const primary = repo.createUser({
      role: 'caregiver',
      phone: '0811',
      name: 'P',
    })
    const secondary = repo.createUser({
      role: 'caregiver',
      phone: '0822',
      name: 'S',
    })
    const elder = repo.createUser({ role: 'elder', phone: '0833', name: 'E' })
    const primaryPair = repo.createPairing({
      elderId: elder.id,
      caregiverId: primary.id,
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    const secondaryPair = repo.createPairing({
      elderId: elder.id,
      caregiverId: secondary.id,
      isPrimary: false,
      permissions: DEFAULT_SECONDARY_PERMISSIONS,
    })
    const pSession = await issueCaregiverSession({ userId: primary.id })

    // Try to toggle self-primary — should 403
    const selfRes = await patchPermissions(
      req(`http://localhost:3000/api/pairings/${primaryPair.id}/permissions`, {
        method: 'PATCH',
        body: {
          permissions: {
            ...DEFAULT_PRIMARY_PERMISSIONS,
            edit_elder_profile: false,
          },
        },
        cookie: `${COOKIES.access}=${pSession.accessToken}`,
      }),
      { params: Promise.resolve({ id: primaryPair.id }) },
    )
    expect(selfRes.status).toBe(403)

    // Toggle secondary
    const res = await patchPermissions(
      req(`http://localhost:3000/api/pairings/${secondaryPair.id}/permissions`, {
        method: 'PATCH',
        body: {
          permissions: {
            ...DEFAULT_SECONDARY_PERMISSIONS,
            edit_elder_profile: true,
          },
        },
        cookie: `${COOKIES.access}=${pSession.accessToken}`,
      }),
      { params: Promise.resolve({ id: secondaryPair.id }) },
    )
    const body = await res.json()
    expect(body.permissions.edit_elder_profile).toBe(true)

    // Secondary cannot edit any permissions
    const sSession = await issueCaregiverSession({ userId: secondary.id })
    const denied = await patchPermissions(
      req(`http://localhost:3000/api/pairings/${secondaryPair.id}/permissions`, {
        method: 'PATCH',
        body: { permissions: DEFAULT_SECONDARY_PERMISSIONS },
        cookie: `${COOKIES.access}=${sSession.accessToken}`,
      }),
      { params: Promise.resolve({ id: secondaryPair.id }) },
    )
    expect(denied.status).toBe(403)
  })

  it('permissions PATCH 404 on unknown pairing', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'C' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const r = await patchPermissions(
      req('http://localhost:3000/api/pairings/missing/permissions', {
        method: 'PATCH',
        body: { permissions: DEFAULT_PRIMARY_PERMISSIONS },
        cookie: `${COOKIES.access}=${s.accessToken}`,
      }),
      { params: Promise.resolve({ id: 'missing' }) },
    )
    expect(r.status).toBe(404)
  })
})
