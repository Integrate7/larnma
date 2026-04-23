/**
 * @jest-environment node
 */
import {
  __setRepository,
  createInMemoryRepository,
} from '@/services/repository'
import { issueCaregiverSession, issueDeviceSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import {
  checkOriginAllowed,
  checkPermission,
  requireCaregiver,
  requireDevice,
  requirePermission,
  requirePrimary,
} from '../guards'
import {
  DEFAULT_PRIMARY_PERMISSIONS,
  DEFAULT_SECONDARY_PERMISSIONS,
} from '@/shared/types'

function fakeReq(cookieValue?: {
  access?: string
  device?: string
}, headers: Record<string, string> = {}): any {
  return {
    cookies: {
      get: (name: string) => {
        if (name === COOKIES.access && cookieValue?.access)
          return { value: cookieValue.access }
        if (name === COOKIES.device && cookieValue?.device)
          return { value: cookieValue.device }
        return undefined
      },
    },
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
    },
  }
}

describe('guards', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('requireCaregiver: unauth without cookie', async () => {
    const a = await requireCaregiver(fakeReq())
    expect(a.ok).toBe(false)
  })

  it('requireCaregiver: unauth on bad token', async () => {
    const a = await requireCaregiver(fakeReq({ access: 'garbage' }))
    expect(a.ok).toBe(false)
  })

  it('requireCaregiver: ok on valid access token', async () => {
    const s = await issueCaregiverSession({ userId: 'u1' })
    const a = await requireCaregiver(fakeReq({ access: s.accessToken }))
    expect(a.ok).toBe(true)
    if (a.ok && a.role === 'caregiver') expect(a.userId).toBe('u1')
  })

  it('requireCaregiver: forbidden when token role mismatches', async () => {
    const d = await issueDeviceSession({ elderId: 'e1', fingerprint: 'fp' })
    const a = await requireCaregiver(fakeReq({ access: d.token }))
    expect(a.ok).toBe(false)
  })

  it('requireDevice: ok on valid device token', async () => {
    const d = await issueDeviceSession({ elderId: 'e1', fingerprint: 'fp' })
    const a = await requireDevice(fakeReq({ device: d.token }))
    expect(a.ok).toBe(true)
    if (a.ok && a.role === 'elder') expect(a.elderId).toBe('e1')
  })

  it('requireDevice: rejects missing cookie', async () => {
    const a = await requireDevice(fakeReq())
    expect(a.ok).toBe(false)
  })

  it('requireDevice: rejects caregiver token', async () => {
    const s = await issueCaregiverSession({ userId: 'u1' })
    const a = await requireDevice(fakeReq({ device: s.accessToken }))
    expect(a.ok).toBe(false)
  })

  it('requireDevice: rejects malformed token', async () => {
    const a = await requireDevice(fakeReq({ device: 'bad' }))
    expect(a.ok).toBe(false)
  })

  it('checkPermission: denies without pairing', () => {
    expect(
      checkPermission({
        caregiverId: 'c',
        elderId: 'e',
        required: 'edit_elder_profile',
      }),
    ).toBe(false)
  })

  it('checkPermission: allows when pairing grants', () => {
    const { getRepository } = require('@/services/repository')
    const repo = getRepository()
    repo.createPairing({
      elderId: 'e',
      caregiverId: 'c',
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    expect(
      checkPermission({
        caregiverId: 'c',
        elderId: 'e',
        required: 'edit_elder_profile',
      }),
    ).toBe(true)
  })

  it('checkPermission: denies when secondary lacks permission', () => {
    const { getRepository } = require('@/services/repository')
    const repo = getRepository()
    repo.createPairing({
      elderId: 'e',
      caregiverId: 'c',
      isPrimary: false,
      permissions: DEFAULT_SECONDARY_PERMISSIONS,
    })
    expect(
      checkPermission({
        caregiverId: 'c',
        elderId: 'e',
        required: 'edit_elder_profile',
      }),
    ).toBe(false)
  })

  it('requirePrimary: true only for primary caregiver', () => {
    const { getRepository } = require('@/services/repository')
    const repo = getRepository()
    repo.createPairing({
      elderId: 'e',
      caregiverId: 'c1',
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    repo.createPairing({
      elderId: 'e',
      caregiverId: 'c2',
      isPrimary: false,
      permissions: DEFAULT_SECONDARY_PERMISSIONS,
    })
    expect(requirePrimary('c1', 'e')).toBe(true)
    expect(requirePrimary('c2', 'e')).toBe(false)
    expect(requirePrimary('unknown', 'e')).toBe(false)
  })

  it('requirePermission: 401 on no auth', async () => {
    const res = await requirePermission(fakeReq(), 'e', 'edit_elder_profile')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(401)
  })

  it('requirePermission: 403 when lacking permission', async () => {
    const s = await issueCaregiverSession({ userId: 'c' })
    const res = await requirePermission(
      fakeReq({ access: s.accessToken }),
      'e',
      'edit_elder_profile',
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
  })

  it('requirePermission: ok when granted', async () => {
    const s = await issueCaregiverSession({ userId: 'c' })
    const { getRepository } = require('@/services/repository')
    getRepository().createPairing({
      elderId: 'e',
      caregiverId: 'c',
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    const res = await requirePermission(
      fakeReq({ access: s.accessToken }),
      'e',
      'edit_elder_profile',
    )
    expect(res.ok).toBe(true)
  })

  it('checkOriginAllowed: no origin returns true', () => {
    expect(checkOriginAllowed(fakeReq())).toBe(true)
  })

  it('checkOriginAllowed: same host allowed', () => {
    expect(
      checkOriginAllowed(
        fakeReq(undefined, {
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        }),
      ),
    ).toBe(true)
  })

  it('checkOriginAllowed: cross-origin denied', () => {
    expect(
      checkOriginAllowed(
        fakeReq(undefined, {
          origin: 'http://evil.example',
          host: 'localhost:3000',
        }),
      ),
    ).toBe(false)
  })

  it('checkOriginAllowed: malformed origin denied', () => {
    expect(
      checkOriginAllowed(
        fakeReq(undefined, { origin: 'not a url', host: 'localhost:3000' }),
      ),
    ).toBe(false)
  })
})
