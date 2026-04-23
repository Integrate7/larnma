import { act, renderHook, waitFor } from '@testing-library/react'
import { useRegisterGlobalState } from '../globalState'

const mockGetParam = jest.fn((_key: string): string | null => null)

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGetParam }),
}))

describe('useRegisterGlobalState', () => {
  beforeEach(() => {
    mockGetParam.mockReturnValue(null)
  })

  it('starts at welcome step', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    expect(result.current.state.step).toBe('welcome')
  })

  it('advance walks from welcome to choice', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    act(() => result.current.advance())
    expect(result.current.state.step).toBe('choice')
  })

  it('advance walks from choice to phone', () => {
    const { result } = renderHook(() => useRegisterGlobalState())
    act(() => result.current.goto('choice'))
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

  describe('fromGoogle flow', () => {
    it('skips to phone step when ?from=google is present', async () => {
      mockGetParam.mockImplementation((key: string) =>
        key === 'from' ? 'google' : null,
      )
      const { result } = renderHook(() => useRegisterGlobalState())
      await waitFor(() => {
        expect(result.current.state.step).toBe('phone')
      })
    })

    it('stays at welcome when ?from param is absent', () => {
      const { result } = renderHook(() => useRegisterGlobalState())
      expect(result.current.state.step).toBe('welcome')
    })

    it('stays at welcome when ?from is not google', () => {
      mockGetParam.mockImplementation((key: string) =>
        key === 'from' ? 'other' : null,
      )
      const { result } = renderHook(() => useRegisterGlobalState())
      expect(result.current.state.step).toBe('welcome')
    })
  })
})
