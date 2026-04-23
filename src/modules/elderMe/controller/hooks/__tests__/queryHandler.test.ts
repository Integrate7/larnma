import { act, renderHook, waitFor } from '@testing-library/react'
import { useElderMeQueryHandler } from '../queryHandler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

describe('useElderMeQueryHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads data on mount', async () => {
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
    const { result } = renderHook(() => useElderMeQueryHandler())
    await waitFor(() => {
      expect(result.current.state.data?.name).toBe('ย่า')
    })
  })

  it('surfaces error on failure', async () => {
    mockFetch(401, { error: 'UNAUTHENTICATED' })
    const { result } = renderHook(() => useElderMeQueryHandler())
    await waitFor(() => {
      expect(result.current.state.error).toBe('UNAUTHENTICATED')
    })
  })

  it('reload re-fetches', async () => {
    mockFetch(401, { error: 'X' })
    const { result } = renderHook(() => useElderMeQueryHandler())
    await waitFor(() => {
      expect(result.current.state.error).toBe('X')
    })
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
    await act(async () => {
      await result.current.reload()
    })
    await waitFor(() => {
      expect(result.current.state.data?.name).toBe('ย่า')
    })
  })
})
