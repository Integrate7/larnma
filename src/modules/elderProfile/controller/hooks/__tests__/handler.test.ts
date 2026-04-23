import { act, renderHook } from '@testing-library/react'
import { useElderProfileGlobalState } from '../globalState'
import { useElderProfileHandler } from '../handler'

function mockFetch(seq: { status: number; body: unknown }[]) {
  let i = 0
  global.fetch = jest.fn().mockImplementation(() => {
    const r = seq[i] ?? seq[seq.length - 1]
    i += 1
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: () => Promise.resolve(r.body),
    } as unknown as Response)
  })
}

describe('useElderProfileHandler.save', () => {
  afterEach(() => jest.restoreAllMocks())

  it('on success sets saved + triggers reload', async () => {
    mockFetch([{ status: 200, body: { id: 'E' } }])
    const reload = jest.fn(async () => {})
    const { result } = renderHook(() => {
      const gs = useElderProfileGlobalState('E')
      const handler = useElderProfileHandler({ gs, reload })
      return { gs, handler }
    })
    await act(async () => {
      await result.current.handler.save('basic', { addressLine: 'x' })
    })
    expect(result.current.gs.state.saved).toBe(true)
    expect(reload).toHaveBeenCalled()
  })

  it('on failure sets error', async () => {
    mockFetch([{ status: 403, body: { error: 'FORBIDDEN' } }])
    const reload = jest.fn(async () => {})
    const { result } = renderHook(() => {
      const gs = useElderProfileGlobalState('E')
      const handler = useElderProfileHandler({ gs, reload })
      return { gs, handler }
    })
    await act(async () => {
      await result.current.handler.save('health', { allergies: [] })
    })
    expect(result.current.gs.state.error).toBe('FORBIDDEN')
    expect(reload).not.toHaveBeenCalled()
  })
})
