import { act, renderHook } from '@testing-library/react'
import { useInviteGlobalState } from '../globalState'
import { useInviteHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll(elderId = 'EL1') {
  return renderHook(() => {
    const gs = useInviteGlobalState()
    const handler = useInviteHandler({ gs, elderId })
    return { gs, handler }
  })
}

describe('useInviteHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  describe('openDialog', () => {
    it('happy path: sets inviteUrl, opens dialog, clears loading', async () => {
      mockFetch(200, { url: '/invite/tok123', exp: '2026-04-24T00:00:00Z' })
      // jsdom uses 'http://localhost' as default origin; handler prepends it to the path
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.openDialog()
      })

      expect(result.current.gs.state.inviteUrl).toBe(`${window.location.origin}/invite/tok123`)
      expect(result.current.gs.state.open).toBe(true)
      expect(result.current.gs.state.loading).toBe(false)
    })

    it('error path: sets error, stays closed', async () => {
      mockFetch(400, { error: 'FORBIDDEN' })

      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.openDialog()
      })

      expect(result.current.gs.state.error).toBe('FORBIDDEN')
      expect(result.current.gs.state.open).toBe(false)
    })
  })

  describe('copyLink', () => {
    it('calls clipboard.writeText and sets copied', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
      })

      const { result } = renderAll()

      act(() => {
        result.current.gs.setInviteUrl('https://larnma.app/invite/tok')
      })

      await act(async () => {
        await result.current.handler.copyLink()
      })

      expect(writeText).toHaveBeenCalledWith('https://larnma.app/invite/tok')
      expect(result.current.gs.state.copied).toBe(true)
    })
  })
})
