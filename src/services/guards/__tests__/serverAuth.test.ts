/**
 * @jest-environment node
 */
import { issueCaregiverSession, issueDeviceSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import {
  __setRepository,
  createInMemoryRepository,
} from '@/services/repository'

const cookieStore = new Map<string, string>()

jest.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value === undefined ? undefined : { name, value }
    },
  }),
}))

import { getServerAuth } from '../serverAuth'

describe('getServerAuth', () => {
  beforeEach(() => {
    cookieStore.clear()
    __setRepository(createInMemoryRepository())
  })

  it('returns null when no cookie is set', async () => {
    const auth = await getServerAuth()
    expect(auth).toBeNull()
  })

  it('returns caregiver role for a valid access token', async () => {
    const s = await issueCaregiverSession({ userId: 'u1' })
    cookieStore.set(COOKIES.access, s.accessToken)
    const auth = await getServerAuth()
    expect(auth).toEqual({ role: 'caregiver', userId: 'u1' })
  })

  it('returns elder role for a valid device token', async () => {
    const d = await issueDeviceSession({ elderId: 'e1', fingerprint: 'fp' })
    cookieStore.set(COOKIES.device, d.token)
    const auth = await getServerAuth()
    expect(auth).toEqual({ role: 'elder', elderId: 'e1' })
  })

  it('returns null when the access token is malformed', async () => {
    cookieStore.set(COOKIES.access, 'garbage')
    const auth = await getServerAuth()
    expect(auth).toBeNull()
  })

  it('returns null when a device token is placed in the access cookie', async () => {
    const d = await issueDeviceSession({ elderId: 'e1', fingerprint: 'fp' })
    cookieStore.set(COOKIES.access, d.token)
    const auth = await getServerAuth()
    expect(auth).toBeNull()
  })

  it('prefers caregiver when both cookies are present', async () => {
    const s = await issueCaregiverSession({ userId: 'u1' })
    const d = await issueDeviceSession({ elderId: 'e1', fingerprint: 'fp' })
    cookieStore.set(COOKIES.access, s.accessToken)
    cookieStore.set(COOKIES.device, d.token)
    const auth = await getServerAuth()
    expect(auth).toEqual({ role: 'caregiver', userId: 'u1' })
  })
})
