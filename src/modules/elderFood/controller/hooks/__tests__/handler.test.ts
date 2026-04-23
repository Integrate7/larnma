import { act, renderHook } from '@testing-library/react'
import { useElderFoodGlobalState } from '../globalState'
import { useElderFoodHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll() {
  return renderHook(() => {
    const gs = useElderFoodGlobalState()
    const handler = useElderFoodHandler(gs)
    return { gs, handler }
  })
}

describe('useElderFoodHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  describe('onSelect', () => {
    it('sets selectedMenuId', () => {
      const { result } = renderAll()
      act(() => result.current.handler.onSelect('menu-42'))
      expect(result.current.gs.gs.selectedMenuId).toBe('menu-42')
    })
  })

  describe('onConfirm', () => {
    it('does nothing when no menu is selected', async () => {
      mockFetch(200, { eventId: 'ev1' })
      const { result } = renderAll()
      await act(async () => { await result.current.handler.onConfirm() })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('sets status to requested on success', async () => {
      mockFetch(200, { eventId: 'ev1' })
      const { result } = renderAll()
      act(() => result.current.gs.setSelectedMenuId('menu-1'))
      await act(async () => { await result.current.handler.onConfirm() })
      expect(result.current.gs.gs.requestStatus).toBe('requested')
    })

    it('sets status to error on failure', async () => {
      mockFetch(400, { error: 'INVALID_BODY' })
      const { result } = renderAll()
      act(() => result.current.gs.setSelectedMenuId('menu-1'))
      await act(async () => { await result.current.handler.onConfirm() })
      expect(result.current.gs.gs.requestStatus).toBe('error')
    })

    it('transitions to requesting while in-flight', async () => {
      let resolve!: (v: unknown) => void
      global.fetch = jest.fn().mockReturnValue(
        new Promise((r) => { resolve = r }),
      )
      const { result } = renderAll()
      act(() => result.current.gs.setSelectedMenuId('menu-1'))
      let p: Promise<void>
      act(() => { p = result.current.handler.onConfirm() })
      expect(result.current.gs.gs.requestStatus).toBe('requesting')
      resolve({ ok: true, status: 200, json: () => Promise.resolve({ eventId: 'ev' }) })
      await act(async () => { await p })
    })
  })
})
