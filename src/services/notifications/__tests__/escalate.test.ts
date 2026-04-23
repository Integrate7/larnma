/**
 * @jest-environment node
 */
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { findAndFlagEscalations } from '../escalate'

describe('findAndFlagEscalations', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('returns empty when repo does not expose caregiver lister', () => {
    // Current in-memory repo does NOT expose __listCaregiverIds, so this
    // function should return [] as a graceful no-op.
    expect(findAndFlagEscalations()).toEqual([])
  })

  it('flags unacked critical notification past window (with fixture repo)', () => {
    const repo = getRepository()
    const noti = repo.createNotification({
      eventId: 'ev',
      caregiverId: 'c',
      priority: 'critical',
    })
    // simulate the fixture-only extension point
    ;(repo as unknown as {
      __listCaregiverIds: () => string[]
    }).__listCaregiverIds = () => ['c']
    // Force createdAt to an old timestamp
    repo.updateNotification(noti.id, {})
    // Use a future "now" far enough past the escalation window
    const escalated = findAndFlagEscalations(Date.now() + 10 * 60_000)
    expect(escalated).toHaveLength(1)
    expect(escalated[0].escalated).toBe(true)

    // Second pass is idempotent — already-escalated notis are skipped
    const second = findAndFlagEscalations(Date.now() + 20 * 60_000)
    expect(second).toHaveLength(0)
  })

  it('skips acked or non-critical notifications', () => {
    const repo = getRepository()
    const acked = repo.createNotification({
      eventId: 'ev',
      caregiverId: 'c',
      priority: 'critical',
    })
    repo.updateNotification(acked.id, { ackAt: new Date().toISOString() })
    repo.createNotification({
      eventId: 'ev2',
      caregiverId: 'c',
      priority: 'normal',
    })
    ;(repo as unknown as {
      __listCaregiverIds: () => string[]
    }).__listCaregiverIds = () => ['c']
    const escalated = findAndFlagEscalations(Date.now() + 10 * 60_000)
    expect(escalated).toHaveLength(0)
  })
})
