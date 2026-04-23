/**
 * @jest-environment node
 */
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { fanOutEvent, priorityForEvent } from '../fanout'
import type { AudioEvent } from '@/shared/types'

function makeEvent(mood: AudioEvent['mood']): AudioEvent {
  const repo = getRepository()
  return repo.createAudioEvent({
    elderId: 'E',
    transcript: 't',
    mood,
    intent: 'CHAT',
    confidence: 0.9,
    summary: '',
    entities: {},
  })
}

describe('fanOutEvent', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
    const repo = getRepository()
    repo.createPairing({
      elderId: 'E',
      caregiverId: 'c1',
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    repo.createPairing({
      elderId: 'E',
      caregiverId: 'c2',
      isPrimary: false,
      permissions: { ...DEFAULT_PRIMARY_PERMISSIONS, receive_noti: false },
    })
  })

  it('priorityForEvent maps mood correctly', () => {
    expect(priorityForEvent(makeEvent('DANGER'))).toBe('critical')
    expect(priorityForEvent(makeEvent('HUNGRY'))).toBe('normal')
    expect(priorityForEvent(makeEvent('HAPPY'))).toBe('log')
  })

  it('does nothing for log-priority moods', () => {
    const event = makeEvent('HAPPY')
    expect(fanOutEvent(event)).toHaveLength(0)
  })

  it('fans out to caregivers with receive_noti', () => {
    const event = makeEvent('DANGER')
    const notis = fanOutEvent(event)
    expect(notis).toHaveLength(1)
    expect(notis[0].caregiverId).toBe('c1')
    expect(notis[0].priority).toBe('critical')
  })

  it('fans out HUNGRY as normal priority', () => {
    const event = makeEvent('HUNGRY')
    const notis = fanOutEvent(event)
    expect(notis[0].priority).toBe('normal')
  })
})
