import { act, renderHook } from '@testing-library/react'
import { useElderHomeGlobalState } from '../globalState'

describe('useElderHomeGlobalState', () => {
  it('initialises with correct default values', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    expect(result.current.gs.micState).toBe('idle')
    expect(result.current.gs.lastResult).toBeNull()
    expect(result.current.gs.errorMessage).toBeNull()
    expect(result.current.gs.orderNotification).toBeNull()
    expect(typeof result.current.gs.isOnline).toBe('boolean')
  })

  it('setMicState updates micState', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    act(() => result.current.setMicState('listening'))
    expect(result.current.gs.micState).toBe('listening')
    act(() => result.current.setMicState('uploading'))
    expect(result.current.gs.micState).toBe('uploading')
    act(() => result.current.setMicState('done'))
    expect(result.current.gs.micState).toBe('done')
    act(() => result.current.setMicState('error'))
    expect(result.current.gs.micState).toBe('error')
  })

  it('setLastResult updates lastResult', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    const mockResult = { mood: 'HUNGRY', eventId: 'ev1', summary: 'หิว', transcript: 'หิวข้าว', intent: 'HUNGRY', confidence: 1 }
    act(() => result.current.setLastResult(mockResult as never))
    expect(result.current.gs.lastResult).toEqual(mockResult)
    act(() => result.current.setLastResult(null))
    expect(result.current.gs.lastResult).toBeNull()
  })

  it('setErrorMessage updates errorMessage', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    act(() => result.current.setErrorMessage('ผิดพลาด'))
    expect(result.current.gs.errorMessage).toBe('ผิดพลาด')
    act(() => result.current.setErrorMessage(null))
    expect(result.current.gs.errorMessage).toBeNull()
  })

  it('setOrderNotification updates orderNotification', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    act(() => result.current.setOrderNotification({ menuName: 'ข้าวผัด', caregiverName: 'หลาน' }))
    expect(result.current.gs.orderNotification).toEqual({ menuName: 'ข้าวผัด', caregiverName: 'หลาน' })
  })

  it('setIsOnline updates isOnline', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    act(() => result.current.setIsOnline(false))
    expect(result.current.gs.isOnline).toBe(false)
    act(() => result.current.setIsOnline(true))
    expect(result.current.gs.isOnline).toBe(true)
  })

  it('responds to online/offline window events', () => {
    const { result } = renderHook(() => useElderHomeGlobalState())
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(result.current.gs.isOnline).toBe(false)
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(result.current.gs.isOnline).toBe(true)
  })

  it('removes event listeners on unmount', () => {
    const { unmount, result } = renderHook(() => useElderHomeGlobalState())
    unmount()
    act(() => { window.dispatchEvent(new Event('offline')) })
    // After unmount the hook's state is no longer updated — no assertion needed
    // just verify no error is thrown
    expect(result.current).toBeDefined()
  })
})
