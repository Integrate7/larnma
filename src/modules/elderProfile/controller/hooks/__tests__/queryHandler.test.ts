import { renderHook, waitFor } from '@testing-library/react'
import { useElderProfileGlobalState } from '../globalState'
import { useElderProfileQueryHandler } from '../queryHandler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

describe('useElderProfileQueryHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  it('loads on mount', async () => {
    mockFetch(200, {
      id: 'E',
      name: 'ย่า',
      phone: '089',
      addressLine: 'a',
      district: 'd',
      province: 'p',
      postalCode: '10100',
      conditions: [],
      medications: [],
      allergies: [],
    })
    const { result } = renderHook(() => {
      const gs = useElderProfileGlobalState('E')
      useElderProfileQueryHandler(gs)
      return gs
    })
    await waitFor(() => {
      expect(result.current.state.data?.name).toBe('ย่า')
    })
  })

  it('surfaces error', async () => {
    mockFetch(403, { error: 'FORBIDDEN' })
    const { result } = renderHook(() => {
      const gs = useElderProfileGlobalState('E')
      useElderProfileQueryHandler(gs)
      return gs
    })
    await waitFor(() => {
      expect(result.current.state.error).toBe('FORBIDDEN')
    })
  })
})
