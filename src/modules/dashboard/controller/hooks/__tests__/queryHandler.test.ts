import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardGlobalState } from '../globalState'
import { useDashboardQueryHandler } from '../queryHandler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll() {
  return renderHook(() => {
    const gs = useDashboardGlobalState()
    const q = useDashboardQueryHandler(gs)
    return { gs, q }
  })
}

describe('useDashboardQueryHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  it('loads events on mount', async () => {
    mockFetch(200, {
      events: [
        {
          id: 'E',
          elderId: 'ED',
          transcript: 't',
          mood: 'HUNGRY',
          intent: 'HUNGRY',
          confidence: 0.9,
          summary: 's',
          entities: {},
          createdAt: new Date().toISOString(),
        },
      ],
      notifications: [],
    })
    const { result } = renderAll()
    await waitFor(() => {
      expect(result.current.gs.state.events).toHaveLength(1)
    })
  })

  it('surfaces error on failure', async () => {
    mockFetch(401, { error: 'UNAUTH' })
    const { result } = renderAll()
    await waitFor(() => {
      expect(result.current.gs.state.error).toBe('UNAUTH')
    })
  })
})
