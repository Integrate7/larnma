import { renderHook, waitFor } from '@testing-library/react'
import { useInviteLandingGlobalState } from '../globalState'
import { useInviteLandingQueryHandler } from '../queryHandler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll(token = 'TOK') {
  return renderHook(() => {
    const gs = useInviteLandingGlobalState(token)
    useInviteLandingQueryHandler(gs)
    return gs
  })
}

describe('useInviteLandingQueryHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  it('loads info on mount', async () => {
    mockFetch(200, {
      elderId: 'E',
      elderName: 'ย่า',
      inviterName: 'ลูก',
      exp: new Date().toISOString(),
    })
    const { result } = renderAll()
    await waitFor(() => {
      expect(result.current.state.info?.elderName).toBe('ย่า')
    })
  })

  it('surfaces error on failure', async () => {
    mockFetch(401, { error: 'INVALID' })
    const { result } = renderAll()
    await waitFor(() => {
      expect(result.current.state.error).toBe('INVALID')
    })
  })
})
