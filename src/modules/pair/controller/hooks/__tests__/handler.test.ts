import { act, renderHook } from '@testing-library/react'
import { usePairGlobalState } from '../globalState'
import { usePairHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll() {
  return renderHook(() => {
    const gs = usePairGlobalState()
    const handler = usePairHandler(gs)
    return { gs, handler }
  })
}

describe('usePairHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('startScan flips state to scanning and clears error', () => {
    const { result } = renderAll()
    act(() => result.current.gs.setErrorMessage('old'))
    act(() => result.current.handler.startScan())
    expect(result.current.gs.gs.state).toBe('scanning')
    expect(result.current.gs.gs.errorMessage).toBeNull()
  })

  it('consume success → success state', async () => {
    mockFetch(200, { elderId: 'E' })
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.consume('token')
    })
    expect(result.current.gs.gs.state).toBe('success')
  })

  it('consume failure → error state + message', async () => {
    mockFetch(401, { error: 'INVALID_TOKEN' })
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.consume('token')
    })
    expect(result.current.gs.gs.state).toBe('error')
    expect(result.current.gs.gs.errorMessage).toBe('INVALID_TOKEN')
  })

  it('onError triggers error state', () => {
    const { result } = renderAll()
    act(() => result.current.handler.onError(new Error('camera denied')))
    expect(result.current.gs.gs.state).toBe('error')
    expect(result.current.gs.gs.errorMessage).toBe('camera denied')
  })

  it('onDecode fires consume', async () => {
    mockFetch(200, { elderId: 'E' })
    const { result } = renderAll()
    await act(async () => {
      result.current.handler.onDecode('tok')
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(result.current.gs.gs.state).toBe('success')
  })
})
