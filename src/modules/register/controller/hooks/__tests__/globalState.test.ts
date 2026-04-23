import { act, renderHook } from '@testing-library/react'
import { useRegisterGlobalState } from '../globalState'

describe('useRegisterGlobalState', () => {
  it('starts at welcome step', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    expect(result.current.state.step).toBe('welcome')
  })

  it('advance walks through steps', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    act(() => result.current.advance())
    expect(result.current.state.step).toBe('phone')
  })

  it('back walks backward but not past start', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    act(() => result.current.back())
    expect(result.current.state.step).toBe('welcome')
  })

  it('goto jumps directly', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    act(() => result.current.goto('qr'))
    expect(result.current.state.step).toBe('qr')
    act(() => result.current.advance())
    // at last step advance is no-op
    expect(result.current.state.step).toBe('qr')
  })

  it('setters update state', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    act(() => {
      result.current.setOtpRef('R1')
      result.current.setElderId('E1')
      result.current.setQrDataUrl('data')
      result.current.setPairingToken('tok')
      result.current.setSubmitting(true)
      result.current.setErrorMessage('err')
    })
    expect(result.current.state.otpRef).toBe('R1')
    expect(result.current.state.elderId).toBe('E1')
    expect(result.current.state.qrDataUrl).toBe('data')
    expect(result.current.state.pairingToken).toBe('tok')
    expect(result.current.state.submitting).toBe(true)
    expect(result.current.state.errorMessage).toBe('err')
  })
})
