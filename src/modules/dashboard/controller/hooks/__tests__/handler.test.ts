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
