import { act, renderHook } from '@testing-library/react'
import { useInviteAcceptFormHandler } from '../formHandler'
import { useInviteLandingGlobalState } from '../globalState'
import { useInviteLandingHandler } from '../handler'

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

function renderAll(token = 'TOK') {
  return renderHook(() => {
    const { form } = useInviteAcceptFormHandler()
    const gs = useInviteLandingGlobalState(token)
    const handler = useInviteLandingHandler({ form, gs })
    return { form, gs, handler }
  })
}

describe('useInviteLandingHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  it('sendOtp: rejects invalid phone', async () => {
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.sendOtp()
    })
    expect(result.current.gs.state.otpSent).toBe(false)
  })

  it('sendOtp: happy path sets otpRef', async () => {
    mockFetch([{ status: 200, body: { ref: 'R', expiresAt: '' } }])
    const { result } = renderAll()
    act(() => result.current.form.setValue('phone', '0811111111'))
    await act(async () => {
      await result.current.handler.sendOtp()
    })
    expect(result.current.gs.state.otpSent).toBe(true)
    expect(result.current.gs.state.otpRef).toBe('R')
  })

  it('sendOtp: surfaces server error', async () => {
    mockFetch([{ status: 429, body: { error: 'RATE_LIMITED' } }])
    const { result } = renderAll()
    act(() => result.current.form.setValue('phone', '0811111111'))
    await act(async () => {
      await result.current.handler.sendOtp()
    })
    expect(result.current.gs.state.error).toBe('RATE_LIMITED')
  })

  it('accept: rejects without otpRef', async () => {
    const { result } = renderAll()
    act(() => {
      result.current.form.setValue('phone', '0811111111')
      result.current.form.setValue('otp', '123456')
      result.current.form.setValue('name', 'A')
    })
    await act(async () => {
      await result.current.handler.accept()
    })
    expect(result.current.gs.state.error).toContain('OTP')
  })

  it('accept: happy path sets accepted flag', async () => {
    mockFetch([{ status: 200, body: { pairingId: 'P', caregiverId: 'C' } }])
    const { result } = renderAll()
    act(() => {
      result.current.form.setValue('phone', '0811111111')
      result.current.form.setValue('otp', '123456')
      result.current.form.setValue('name', 'A')
      result.current.gs.setOtpRef('R')
    })
    await act(async () => {
      await result.current.handler.accept()
    })
    expect(result.current.gs.state.accepted).toBe(true)
  })

  it('accept: surfaces server error', async () => {
    mockFetch([{ status: 409, body: { error: 'CONSUMED' } }])
    const { result } = renderAll()
    act(() => {
      result.current.form.setValue('phone', '0811111111')
      result.current.form.setValue('otp', '123456')
      result.current.form.setValue('name', 'A')
      result.current.gs.setOtpRef('R')
    })
    await act(async () => {
      await result.current.handler.accept()
    })
    expect(result.current.gs.state.error).toBe('CONSUMED')
  })
})
