import { act, renderHook } from '@testing-library/react'
import { useDashboardGlobalState } from '../globalState'
import { useDashboardHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

describe('useDashboardHandler.ack', () => {
  afterEach(() => jest.restoreAllMocks())

  it('on success patches the notification', async () => {
    mockFetch(200, { locked: true, lockedByCaregiverId: 'CG1' })
    const { result } = renderHook(() => {
      const gs = useDashboardGlobalState()
      const handler = useDashboardHandler({ gs, reload: async () => {} })
      return { gs, handler }
    })
    act(() =>
      result.current.gs.prependNotification({
        id: 'N',
        eventId: 'ev',
        caregiverId: 'CG1',
        priority: 'critical',
        createdAt: new Date().toISOString(),
      }),
    )
    await act(async () => {
      await result.current.handler.ack('N')
    })
    expect(result.current.gs.state.notifications[0].ackAt).toBeTruthy()
  })

  it('on failure sets error', async () => {
    mockFetch(403, { error: 'FORBIDDEN' })
    const { result } = renderHook(() => {
      const gs = useDashboardGlobalState()
      const handler = useDashboardHandler({ gs, reload: async () => {} })
      return { gs, handler }
    })
    await act(async () => {
      await result.current.handler.ack('N')
    })
    expect(result.current.gs.state.error).toBe('FORBIDDEN')
  })
})

describe('useDashboardHandler.order', () => {
  afterEach(() => jest.restoreAllMocks())

  function setupWithEvent(menuSuggestions: Array<{ id: string; name: string; price: number }>) {
    return renderHook(() => {
      const gs = useDashboardGlobalState()
      const handler = useDashboardHandler({ gs, reload: async () => {} })
      return { gs, handler }
    })
  }

  it('does nothing when eventId not found in events list', async () => {
    mockFetch(200, { id: 'o1', status: 'pending', total: 85 })
    const { result } = setupWithEvent([])
    act(() => {
      result.current.gs.prependNotification({
        id: 'N', eventId: 'MISSING_EV', caregiverId: 'CG1', priority: 'normal',
        createdAt: new Date().toISOString(),
      })
    })
    await act(async () => {
      await result.current.handler.order(
        { id: 'N', eventId: 'MISSING_EV', caregiverId: 'CG1', priority: 'normal', createdAt: '' } as never,
        [],
        'menu-1',
      )
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does nothing when chosen menu not in suggestions', async () => {
    mockFetch(200, { id: 'o1', status: 'pending', total: 85 })
    const { result } = setupWithEvent([])
    const event = { id: 'EV1', elderId: 'e1', entities: { menuSuggestions: [{ id: 'menu-1', name: 'ข้าว', price: 85 }] }, createdAt: '', mood: 'HUNGRY', intent: 'HUNGRY', transcript: '', confidence: 1, summary: '' }
    act(() => result.current.gs.prependEvent(event as never))
    await act(async () => {
      await result.current.handler.order(
        { id: 'N', eventId: 'EV1', caregiverId: 'CG1', priority: 'normal', createdAt: '' } as never,
        [event as never],
        'NONEXISTENT_MENU',
      )
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('creates order on success and tracks orderedEventId', async () => {
    mockFetch(200, { id: 'o1', status: 'pending', total: 85 })
    const { result } = setupWithEvent([])
    const event = {
      id: 'EV1', elderId: 'e1', createdAt: '', mood: 'HUNGRY', intent: 'HUNGRY',
      transcript: '', confidence: 1, summary: '',
      entities: { menuSuggestions: [{ id: 'menu-1', name: 'ข้าว', price: 85 }] },
    }
    act(() => result.current.gs.prependEvent(event as never))
    await act(async () => {
      await result.current.handler.order(
        { id: 'N', eventId: 'EV1', caregiverId: 'CG1', priority: 'normal', createdAt: '' } as never,
        [event as never],
        'menu-1',
      )
    })
    expect(result.current.gs.state.orderedEventIds).toContain('EV1')
  })

  it('sets error when order API fails', async () => {
    mockFetch(403, { error: 'FORBIDDEN' })
    const { result } = setupWithEvent([])
    const event = {
      id: 'EV2', elderId: 'e1', createdAt: '', mood: 'HUNGRY', intent: 'HUNGRY',
      transcript: '', confidence: 1, summary: '',
      entities: { menuSuggestions: [{ id: 'menu-2', name: 'ก๋วยเตี๋ยว', price: 70 }] },
    }
    act(() => result.current.gs.prependEvent(event as never))
    await act(async () => {
      await result.current.handler.order(
        { id: 'N', eventId: 'EV2', caregiverId: 'CG1', priority: 'normal', createdAt: '' } as never,
        [event as never],
        'menu-2',
      )
    })
    expect(result.current.gs.state.error).toBe('FORBIDDEN')
  })
})
