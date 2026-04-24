/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import type { AudioEvent, Notification } from '@/shared/types'
import { useCriticalAlerts } from '../criticalAlerts'

jest.mock('../telNavigation', () => ({
  navigateToTel: jest.fn(),
}))

function makeNoti(overrides: Partial<Notification> = {}): Notification {
  return {
    id: overrides.id ?? 'N1',
    eventId: overrides.eventId ?? 'E1',
    caregiverId: overrides.caregiverId ?? 'CG1',
    priority: overrides.priority ?? 'critical',
    createdAt: overrides.createdAt ?? '2026-04-24T12:00:00.000Z',
    ...overrides,
  }
}

function makeEvent(overrides: Partial<AudioEvent> = {}): AudioEvent {
  return {
    id: overrides.id ?? 'E1',
    elderId: overrides.elderId ?? 'EL1',
    transcript: overrides.transcript ?? 'ตกบันได',
    mood: overrides.mood ?? 'DANGER',
    intent: overrides.intent ?? 'DANGER',
    confidence: overrides.confidence ?? 0.95,
    summary: overrides.summary ?? 'คุณยายตกบันได',
    entities: overrides.entities ?? {},
    createdAt: overrides.createdAt ?? '2026-04-24T12:00:00.000Z',
  }
}

const NO_ELDER = null
const ELDER = { name: 'ย่า', phone: '0812345678' }
const noopAck = async () => {}

describe('useCriticalAlerts — derivation', () => {
  it('returns open=false when there are no notifications', () => {
    const { result } = renderHook(() =>
      useCriticalAlerts([], [], ELDER, noopAck),
    )
    expect(result.current.open).toBe(false)
    expect(result.current.cases).toEqual([])
  })

  it('returns open=false when all notifications are normal/log', () => {
    const notis = [
      makeNoti({ id: 'N1', priority: 'normal' }),
      makeNoti({ id: 'N2', priority: 'log' }),
    ]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, [], ELDER, noopAck),
    )
    expect(result.current.open).toBe(false)
  })

  it('returns open=true when an unacked critical notification is present', () => {
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.open).toBe(true)
    expect(result.current.cases).toHaveLength(1)
    expect(result.current.cases[0]).toMatchObject({
      id: 'N1',
      priority: 'critical',
      transcript: 'ตกบันได',
      summary: 'คุณยายตกบันได',
    })
  })

  it('returns open=true when an unacked high notification is present', () => {
    const notis = [makeNoti({ id: 'N2', priority: 'high', eventId: 'E2' })]
    const events = [
      makeEvent({ id: 'E2', transcript: 'ปวดหัว', summary: 'คุณยายปวดหัว' }),
    ]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.open).toBe(true)
    expect(result.current.tone).toBe('high')
  })

  it('filters out acknowledged notifications', () => {
    const notis = [
      makeNoti({
        id: 'N1',
        priority: 'critical',
        ackAt: '2026-04-24T12:05:00.000Z',
      }),
    ]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, [], ELDER, noopAck),
    )
    expect(result.current.open).toBe(false)
  })

  it('tone is critical when any case is critical', () => {
    const notis = [
      makeNoti({ id: 'N1', priority: 'high', eventId: 'E1' }),
      makeNoti({ id: 'N2', priority: 'critical', eventId: 'E2' }),
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.tone).toBe('critical')
    expect(result.current.cases).toHaveLength(2)
  })

  it('tone is high when all cases are high-only', () => {
    const notis = [
      makeNoti({ id: 'N1', priority: 'high', eventId: 'E1' }),
      makeNoti({ id: 'N2', priority: 'high', eventId: 'E2' }),
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.tone).toBe('high')
  })

  it('falls back to empty strings when the matching event is missing', () => {
    const notis = [makeNoti({ id: 'N1', priority: 'critical', eventId: 'MISS' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, [], ELDER, noopAck),
    )
    expect(result.current.cases[0]).toMatchObject({
      id: 'N1',
      transcript: '',
      summary: '',
    })
  })

  it('passes through elderName and elderPhone from primaryElder', () => {
    const { result } = renderHook(() =>
      useCriticalAlerts([], [], ELDER, noopAck),
    )
    expect(result.current.elderName).toBe('ย่า')
    expect(result.current.elderPhone).toBe('0812345678')
  })

  it('sets elderName and elderPhone to null when no primaryElder', () => {
    const { result } = renderHook(() =>
      useCriticalAlerts([], [], NO_ELDER, noopAck),
    )
    expect(result.current.elderName).toBeNull()
    expect(result.current.elderPhone).toBeNull()
  })
})

describe('useCriticalAlerts — handlers', () => {
  const { navigateToTel } = jest.requireMock('../telNavigation') as {
    navigateToTel: jest.Mock
  }

  beforeEach(() => {
    navigateToTel.mockClear()
  })

  it('onClose marks all current cases as shown and closes', () => {
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const { result, rerender } = renderHook(
      ({ n }: { n: Notification[] }) =>
        useCriticalAlerts(n, [], ELDER, noopAck),
      { initialProps: { n: notis } },
    )
    expect(result.current.open).toBe(true)

    result.current.onClose()
    rerender({ n: notis })

    expect(result.current.open).toBe(false)
  })

  it('onCallElder fires ackFn once per displayed case and navigates', async () => {
    const ack = jest.fn().mockResolvedValue(undefined)
    const notis = [
      makeNoti({ id: 'N1', priority: 'critical', eventId: 'E1' }),
      makeNoti({ id: 'N2', priority: 'high', eventId: 'E2' }),
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, ack),
    )

    result.current.onCallElder()

    await new Promise((r) => setTimeout(r, 0))

    expect(ack).toHaveBeenCalledTimes(2)
    expect(ack).toHaveBeenCalledWith('N1')
    expect(ack).toHaveBeenCalledWith('N2')
    expect(navigateToTel).toHaveBeenCalledWith('0812345678')
  })

  it('onCall1669 fires ackFn for each case and navigates to tel:1669', async () => {
    const ack = jest.fn().mockResolvedValue(undefined)
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, ack),
    )

    result.current.onCall1669()
    await new Promise((r) => setTimeout(r, 0))

    expect(ack).toHaveBeenCalledWith('N1')
    expect(navigateToTel).toHaveBeenCalledWith('1669')
  })

  it('onCallElder is a no-op when elderPhone is null', () => {
    const ack = jest.fn().mockResolvedValue(undefined)
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, { name: 'ย่า', phone: null }, ack),
    )

    result.current.onCallElder()

    expect(ack).not.toHaveBeenCalled()
    expect(navigateToTel).not.toHaveBeenCalled()
  })

  it('does not crash when ackFn rejects; dialog still closes', async () => {
    const ack = jest.fn().mockRejectedValue(new Error('500'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result, rerender } = renderHook(
      ({ n }: { n: Notification[] }) =>
        useCriticalAlerts(n, events, ELDER, ack),
      { initialProps: { n: notis } },
    )

    result.current.onCall1669()
    await new Promise((r) => setTimeout(r, 0))
    rerender({ n: notis })

    expect(result.current.open).toBe(false)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('SSE appending a critical to a high-only dialog upgrades tone', () => {
    const initial: Notification[] = [
      makeNoti({ id: 'N1', priority: 'high', eventId: 'E1' }),
    ]
    const added: Notification[] = [
      makeNoti({ id: 'N2', priority: 'critical', eventId: 'E2' }),
      ...initial,
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result, rerender } = renderHook(
      ({ n }: { n: Notification[] }) =>
        useCriticalAlerts(n, events, ELDER, noopAck),
      { initialProps: { n: initial } },
    )

    expect(result.current.tone).toBe('high')

    rerender({ n: added })

    expect(result.current.tone).toBe('critical')
    expect(result.current.cases).toHaveLength(2)
  })
})
