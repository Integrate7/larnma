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

  it('sets locations and pairings when all APIs succeed', async () => {
    const eventsBody = { events: [], notifications: [] }
    const locationsBody = { locations: [{ elderId: 'e1', lat: 13.75, lng: 100.5, capturedAt: new Date().toISOString() }] }
    const pairingsBody = [{ id: 'p1', elderId: 'e1', isPrimary: true, elderName: 'ย่าสมร' }]
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(eventsBody) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(locationsBody) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(pairingsBody) } as unknown as Response)
    const { result } = renderAll()
    await waitFor(() => {
      expect(result.current.gs.state.locations).toHaveLength(1)
      expect(result.current.gs.state.pairings).toHaveLength(1)
      expect(result.current.gs.state.pairings[0].elderName).toBe('ย่าสมร')
    })
  })

  it('fetches each endpoint exactly once on mount (no refetch loop)', async () => {
    // Every load() call writes to gs (replaceAll/setError/setLocations/setPairings),
    // which re-renders the hook. With unstable deps the effect would refire the
    // fetch trio on every rerender. Assert we stopped at one round = 3 calls.
    mockFetch(200, { events: [], notifications: [] })
    const { result } = renderAll()
    await waitFor(() => {
      expect(result.current.gs.state.error).toBe(null)
    })
    // Allow any looping effect a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(3)
  })
})
