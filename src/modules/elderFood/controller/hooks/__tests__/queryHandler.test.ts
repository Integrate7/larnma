import { renderHook, waitFor } from '@testing-library/react'
import { useElderFoodGlobalState } from '../globalState'
import { useElderFoodQueryHandler } from '../queryHandler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

const fakeMenus = {
  items: [
    {
      id: 'm1',
      name: 'ข้าวผัด',
      price: 80,
      conditionsExcluded: [],
      allergensContained: [],
      allergyMatch: [],
      conditionMatch: [],
      isSafe: true,
      suggestedAlternative: null,
    },
  ],
}

describe('useElderFoodQueryHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  it('fetches menus and populates state on success', async () => {
    mockFetch(200, fakeMenus)
    const { result } = renderHook(() => {
      const gs = useElderFoodGlobalState()
      useElderFoodQueryHandler(gs)
      return gs
    })
    await waitFor(() => {
      expect(result.current.gs.loading).toBe(false)
    })
    expect(result.current.gs.menus).toHaveLength(1)
    expect(result.current.gs.menus[0].name).toBe('ข้าวผัด')
    expect(result.current.gs.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    mockFetch(401, { error: 'UNAUTHORIZED' })
    const { result } = renderHook(() => {
      const gs = useElderFoodGlobalState()
      useElderFoodQueryHandler(gs)
      return gs
    })
    await waitFor(() => {
      expect(result.current.gs.loading).toBe(false)
    })
    expect(result.current.gs.error).toBeTruthy()
    expect(result.current.gs.menus).toEqual([])
  })
})
