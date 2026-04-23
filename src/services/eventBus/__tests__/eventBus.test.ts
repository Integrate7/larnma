import {
  listenerCount,
  publishTo,
  publishToAll,
  resetEventBus,
  subscribe,
} from '../eventBus'

describe('eventBus', () => {
  beforeEach(() => resetEventBus())

  it('subscribe + publishTo delivers events', () => {
    const received: string[] = []
    subscribe('c1', () => received.push('x'))
    publishTo('c1', { kind: 'heartbeat' })
    publishTo('c1', { kind: 'heartbeat' })
    expect(received).toHaveLength(2)
  })

  it('unsubscribe cleans up listeners', () => {
    const unsub = subscribe('c1', () => {})
    expect(listenerCount('c1')).toBe(1)
    unsub()
    expect(listenerCount('c1')).toBe(0)
  })

  it('publishToAll fans out to many caregivers', () => {
    const a: string[] = []
    const b: string[] = []
    subscribe('c1', () => a.push('x'))
    subscribe('c2', () => b.push('x'))
    publishToAll(['c1', 'c2'], { kind: 'heartbeat' })
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
  })

  it('listener errors do not break other listeners', () => {
    const received: string[] = []
    subscribe('c1', () => {
      throw new Error('boom')
    })
    subscribe('c1', () => received.push('ok'))
    publishTo('c1', { kind: 'heartbeat' })
    expect(received).toEqual(['ok'])
  })

  it('resetEventBus clears all listeners', () => {
    subscribe('c1', () => {})
    resetEventBus()
    expect(listenerCount('c1')).toBe(0)
  })

  it('publishTo to missing caregiver is a no-op', () => {
    expect(() => publishTo('nope', { kind: 'heartbeat' })).not.toThrow()
  })
})
