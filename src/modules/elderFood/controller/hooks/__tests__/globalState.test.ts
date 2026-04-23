import { act, renderHook } from '@testing-library/react'
import { useElderFoodGlobalState } from '../globalState'

describe('useElderFoodGlobalState', () => {
  it('initialises with loading=true and empty menus', () => {
    const { result } = renderHook(() => useElderFoodGlobalState())
    expect(result.current.gs.loading).toBe(true)
    expect(result.current.gs.menus).toEqual([])
    expect(result.current.gs.error).toBeNull()
    expect(result.current.gs.selectedMenuId).toBeNull()
    expect(result.current.gs.requestStatus).toBe('idle')
  })

  it('setMenus updates menus array', () => {
    const { result } = renderHook(() => useElderFoodGlobalState())
    const fakeMenu = [{ id: 'm1', name: 'ข้าวผัด', price: 80, isSafe: true, conditionsExcluded: [], allergensContained: [], allergyMatch: [], conditionMatch: [], suggestedAlternative: null }]
    act(() => result.current.setMenus(fakeMenu))
    expect(result.current.gs.menus).toEqual(fakeMenu)
  })

  it('setLoading toggles loading flag', () => {
    const { result } = renderHook(() => useElderFoodGlobalState())
    act(() => result.current.setLoading(false))
    expect(result.current.gs.loading).toBe(false)
    act(() => result.current.setLoading(true))
    expect(result.current.gs.loading).toBe(true)
  })

  it('setError updates error message', () => {
    const { result } = renderHook(() => useElderFoodGlobalState())
    act(() => result.current.setError('ผิดพลาด'))
    expect(result.current.gs.error).toBe('ผิดพลาด')
    act(() => result.current.setError(null))
    expect(result.current.gs.error).toBeNull()
  })

  it('setSelectedMenuId updates selected menu', () => {
    const { result } = renderHook(() => useElderFoodGlobalState())
    act(() => result.current.setSelectedMenuId('menu-1'))
    expect(result.current.gs.selectedMenuId).toBe('menu-1')
    act(() => result.current.setSelectedMenuId(null))
    expect(result.current.gs.selectedMenuId).toBeNull()
  })

  it('setRequestStatus transitions correctly', () => {
    const { result } = renderHook(() => useElderFoodGlobalState())
    act(() => result.current.setRequestStatus('requesting'))
    expect(result.current.gs.requestStatus).toBe('requesting')
    act(() => result.current.setRequestStatus('requested'))
    expect(result.current.gs.requestStatus).toBe('requested')
    act(() => result.current.setRequestStatus('error'))
    expect(result.current.gs.requestStatus).toBe('error')
  })
})
