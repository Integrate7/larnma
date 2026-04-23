/**
 * @jest-environment node
 */
import {
  __setRepository,
  createInMemoryRepository,
} from '@/services/repository'
import { issueCaregiverSession, rotateCaregiverSession } from '../authService'

describe('authService', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('issueCaregiverSession returns tokens and session id', async () => {
    const s = await issueCaregiverSession({ userId: 'u1' })
    expect(s.accessToken).toBeTruthy()
    expect(s.refreshToken).toBeTruthy()
    expect(s.sessionId).toBeTruthy()
    expect(s.userId).toBe('u1')
  })

  it('rotateCaregiverSession returns new tokens for valid refresh', async () => {
    const s1 = await issueCaregiverSession({ userId: 'u1' })
    const s2 = await rotateCaregiverSession(s1.refreshToken)
    expect(s2).not.toBeNull()
    expect(s2?.refreshToken).not.toBe(s1.refreshToken)
  })

  it('rotateCaregiverSession rejects invalid token', async () => {
    const v = await rotateCaregiverSession('not-a-jwt')
    expect(v).toBeNull()
  })
})
