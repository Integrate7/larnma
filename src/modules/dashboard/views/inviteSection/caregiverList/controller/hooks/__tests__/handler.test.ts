import { act, renderHook } from '@testing-library/react'
import { useCaregiverListGlobalState } from '../globalState'
import { useCaregiverListHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll(elderId = 'EL1') {
  return renderHook(() => {
    const gs = useCaregiverListGlobalState()
    const handler = useCaregiverListHandler({ gs, elderId })
    return { gs, handler }
  })
}

describe('useCaregiverListHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  describe('load', () => {
    it('happy path: sets caregivers from API response', async () => {
      const caregivers = [
        { pairingId: 'p1', name: 'หลาน', phone: '0811', isPrimary: true, isCurrentUser: true },
        { pairingId: 'p2', name: 'ลูก', phone: '0812', isPrimary: false, isCurrentUser: false },
      ]
      mockFetch(200, { caregivers })
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.load()
      })

      expect(result.current.gs.state.caregivers).toEqual(caregivers)
      expect(result.current.gs.state.loading).toBe(false)
      expect(result.current.gs.state.error).toBeNull()
    })

    it('error path: sets error on API failure', async () => {
      mockFetch(403, { error: 'FORBIDDEN' })
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.load()
      })

      expect(result.current.gs.state.error).toBe('FORBIDDEN')
      expect(result.current.gs.state.caregivers).toEqual([])
    })
  })

  describe('revoke', () => {
    it('happy path: calls DELETE and reloads', async () => {
      const caregivers = [
        { pairingId: 'p1', name: 'หลาน', phone: '0811', isPrimary: true, isCurrentUser: true },
      ]
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ caregivers }),
        })
      global.fetch = fetchMock as unknown as typeof fetch

      const { result } = renderAll('EL1')

      await act(async () => {
        await result.current.handler.revoke('p2')
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      const [deleteCall] = fetchMock.mock.calls
      expect(deleteCall[0]).toBe('/api/pairings/p2')
      expect((deleteCall[1] as RequestInit).method).toBe('DELETE')
    })

    it('error path: sets error on revoke failure, does not reload', async () => {
      mockFetch(403, { error: 'FORBIDDEN' })
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.revoke('p2')
      })

      expect(result.current.gs.state.error).toBe('FORBIDDEN')
    })
  })
})
