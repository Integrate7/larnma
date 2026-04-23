import { act, renderHook } from '@testing-library/react'
import type { AudioEvent, Notification } from '@/shared/types'
import { useDashboardGlobalState } from '../globalState'

const sampleEvent = (id: string, mood: AudioEvent['mood']): AudioEvent => ({
  id,
  elderId: 'E',
  transcript: 't',
  mood,
  intent: 'CHAT',
  confidence: 0.9,
  summary: 's',
  entities: {},
  createdAt: new Date().toISOString(),
})

const sampleNoti = (id: string): Notification => ({
  id,
  eventId: 'ev',
  caregiverId: 'c',
  priority: 'normal',
  createdAt: new Date().toISOString(),
})

describe('useDashboardGlobalState', () => {
  it('prependEvent dedupes by id', () => {
    const { result } = renderHook(() => useDashboardGlobalState())
    act(() => result.current.prependEvent(sampleEvent('A', 'HUNGRY')))
    act(() => result.current.prependEvent(sampleEvent('A', 'HUNGRY')))
    expect(result.current.state.events).toHaveLength(1)
  })

  it('prependNotification dedupes + updateNotification patches', () => {
    const { result } = renderHook(() => useDashboardGlobalState())
    act(() => result.current.prependNotification(sampleNoti('N1')))
    act(() => result.current.prependNotification(sampleNoti('N1')))
    expect(result.current.state.notifications).toHaveLength(1)
    act(() => result.current.updateNotification('N1', { ackAt: '2026-04-23' }))
    expect(result.current.state.notifications[0].ackAt).toBe('2026-04-23')
  })

  it('moodCounts aggregates', () => {
    const { result } = renderHook(() => useDashboardGlobalState())
    act(() => {
      result.current.prependEvent(sampleEvent('A', 'HUNGRY'))
      result.current.prependEvent(sampleEvent('B', 'HUNGRY'))
      result.current.prependEvent(sampleEvent('C', 'HAPPY'))
    })
    expect(result.current.state.moodCounts.HUNGRY).toBe(2)
    expect(result.current.state.moodCounts.HAPPY).toBe(1)
  })

  it('replaceAll replaces both arrays', () => {
    const { result } = renderHook(() => useDashboardGlobalState())
    act(() =>
      result.current.replaceAll(
        [sampleEvent('X', 'DANGER')],
        [sampleNoti('N')],
      ),
    )
    expect(result.current.state.events[0].id).toBe('X')
    expect(result.current.state.notifications[0].id).toBe('N')
  })

  it('setConnecting / setError flip state', () => {
    const { result } = renderHook(() => useDashboardGlobalState())
    act(() => result.current.setConnecting(false))
    expect(result.current.state.connecting).toBe(false)
    act(() => result.current.setError('oh no'))
    expect(result.current.state.error).toBe('oh no')
  })
})
