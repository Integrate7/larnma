import { act, renderHook, waitFor } from '@testing-library/react'
import { useRegisterFormHandler } from '../formHandler'
import { useRegisterGlobalState } from '../globalState'
import { useRegisterHandler } from '../handler'

type Json = { status: number; body: unknown }

function mockFetchSequence(seq: Json[]) {
  let i = 0
  ;(global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
    const r = seq[i] ?? seq[seq.length - 1]
    i += 1
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: () => Promise.resolve(r.body),
    } as unknown as Response)
  })
}

function renderHandler() {
  return renderHook(() => {
    const { form } = useRegisterFormHandler()
    const gs = useRegisterGlobalState()
    const handler = useRegisterHandler({ form, gs })
    return { form, gs, handler }
  })
}

describe('useRegisterHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sendOtp: invalid phone stops at trigger', async () => {
    const { result } = renderHandler()
    await act(async () => {
      await result.current.handler.sendOtp()
    })
    expect(result.current.gs.state.step).toBe('welcome')
  })

  it('sendOtp: happy path advances to otp + stores ref', async () => {
    mockFetchSequence([
      { status: 200, body: { ref: 'R1', expiresAt: new Date().toISOString() } },
    ])
    const { result } = renderHandler()
    act(() => result.current.form.setValue('phone', '0812345678'))
    await act(async () => {
      await result.current.handler.sendOtp()
    })
    expect(result.current.gs.state.otpRef).toBe('R1')
    expect(result.current.gs.state.step).toBe('otp')
  })

  it('sendOtp: surfaces server error', async () => {
    mockFetchSequence([
      {
        status: 429,
        body: { error: 'RATE_LIMITED', errorCode: 'RATE_LIMITED' },
      },
    ])
    const { result } = renderHandler()
    act(() => result.current.form.setValue('phone', '0812345678'))
    await act(async () => {
      await result.current.handler.sendOtp()
    })
    expect(result.current.gs.state.errorMessage).toBe('RATE_LIMITED')
  })

  it('verifyOtp: rejects without otpRef', async () => {
    const { result } = renderHandler()
    act(() => result.current.form.setValue('otp', '123456'))
    await act(async () => {
      await result.current.handler.verifyOtp()
    })
    expect(result.current.gs.state.errorMessage).toContain('OTP')
  })

  it('verifyOtp: happy path advances to caregiver', async () => {
    mockFetchSequence([
      { status: 200, body: { userId: 'u', role: 'caregiver' } },
    ])
    const { result } = renderHandler()
    act(() => {
      result.current.form.setValue('phone', '0812345678')
      result.current.form.setValue('otp', '123456')
      result.current.gs.setOtpRef('R1')
    })
    await act(async () => {
      await result.current.handler.verifyOtp()
    })
    await waitFor(() => {
      expect(result.current.gs.state.step).toBe('caregiver')
    })
  })

  it('submitCaregiver: happy path advances to consent', async () => {
    mockFetchSequence([{ status: 200, body: { id: 'u', name: 'A' } }])
    const { result } = renderHandler()
    act(() => {
      result.current.form.setValue('caregiverName', 'A')
      result.current.form.setValue('relationship', 'ลูก')
    })
    await act(async () => {
      await result.current.handler.submitCaregiver()
    })
    expect(result.current.gs.state.step).toBe('consent')
  })

  it('submitConsent: rejects without required consents', async () => {
    const { result } = renderHandler()
    await act(async () => {
      await result.current.handler.submitConsent()
    })
    expect(result.current.gs.state.errorMessage).toContain('ยินยอม')
  })

  it('submitConsent: happy path advances to elderBasic', async () => {
    mockFetchSequence([{ status: 200, body: { count: 3 } }])
    const { result } = renderHandler()
    act(() => {
      result.current.form.setValue('consentAudioAi', true)
      result.current.form.setValue('consentHealthData', true)
    })
    await act(async () => {
      await result.current.handler.submitConsent()
    })
    expect(result.current.gs.state.step).toBe('elderBasic')
  })

  it('next: elderEmergency blocks when contact name set without phone', async () => {
    const { result } = renderHandler()
    act(() => {
      result.current.gs.goto('elderEmergency')
      result.current.form.setValue('hospitalName', 'รพ.')
      result.current.form.setValue('hospitalPhone', '')
    })
    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderEmergency')
    expect(
      result.current.form.getFieldState('hospitalPhone').error?.message,
    ).toBe('กรุณากรอกเบอร์โทร')
  })

  it('next: elderEmergency blocks when phone set without name', async () => {
    const { result } = renderHandler()
    act(() => {
      result.current.gs.goto('elderEmergency')
      result.current.form.setValue('doctorName', '')
      result.current.form.setValue('doctorPhone', '0812345678')
    })
    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderEmergency')
    expect(result.current.form.getFieldState('doctorName').error?.message).toBe(
      'กรุณากรอกชื่อ',
    )
  })

  it('next: elderEmergency blocks when phone format invalid', async () => {
    const { result } = renderHandler()
    act(() => {
      result.current.gs.goto('elderEmergency')
      result.current.form.setValue('backupName', 'พี่')
      result.current.form.setValue('backupPhone', '123')
    })
    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderEmergency')
    expect(
      result.current.form.getFieldState('backupPhone').error?.message,
    ).toBe('เบอร์ต้องเป็น 10 หลัก')
  })

  it('next: elderEmergency passes when all contacts are empty', async () => {
    const { result } = renderHandler()
    act(() => {
      result.current.gs.goto('elderEmergency')
    })
    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderOptional')
  })

  it('submitElder: rejects when emergency contact has name without phone', async () => {
    const fetchMock = jest.fn()
    ;(global.fetch as jest.Mock) = fetchMock
    const { result } = renderHandler()
    act(() => {
      result.current.form.setValue('elderName', 'ย่า')
      result.current.form.setValue('elderPhone', '0899999999')
      result.current.form.setValue('addressLine', 'a')
      result.current.form.setValue('district', 'd')
      result.current.form.setValue('province', 'p')
      result.current.form.setValue('postalCode', '10100')
      result.current.form.setValue('hospitalName', 'รพ.')
      result.current.form.setValue('hospitalPhone', '')
    })
    await act(async () => {
      await result.current.handler.submitElder()
    })
    expect(result.current.gs.state.elderId).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      result.current.form.getFieldState('hospitalPhone').error?.message,
    ).toBe('กรุณากรอกเบอร์โทร')
  })

  it('submitElder: happy path advances to qr + stores elderId', async () => {
    mockFetchSequence([{ status: 201, body: { id: 'ELDER-1' } }])
    const { result } = renderHandler()
    act(() => {
      result.current.form.setValue('elderName', 'ย่า')
      result.current.form.setValue('elderPhone', '0899999999')
      result.current.form.setValue('addressLine', 'a')
      result.current.form.setValue('district', 'd')
      result.current.form.setValue('province', 'p')
      result.current.form.setValue('postalCode', '10100')
      result.current.form.setValue('heightCm', 160)
      result.current.form.setValue('weightKg', 55)
      result.current.form.setValue('bloodType', 'O')
      result.current.form.setValue('hospitalName', 'รพ.')
      result.current.form.setValue('hospitalPhone', '0211111111')
      result.current.form.setValue('doctorName', 'หมอ')
      result.current.form.setValue('doctorPhone', '0222222222')
      result.current.form.setValue('backupName', 'พี่')
      result.current.form.setValue('backupPhone', '0833333333')
    })
    await act(async () => {
      await result.current.handler.submitElder()
    })
    expect(result.current.gs.state.elderId).toBe('ELDER-1')
    expect(result.current.gs.state.step).toBe('qr')
  })

  it('generateQr: fills qrDataUrl on success', async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          qrDataUrl: 'data:image/png;base64,xx',
          token: 'TOK',
          exp: new Date().toISOString(),
        },
      },
    ])
    const { result } = renderHandler()
    act(() => {
      result.current.gs.setElderId('E1')
    })
    await act(async () => {
      await result.current.handler.generateQr()
    })
    expect(result.current.gs.state.qrDataUrl).toContain('data:image/png')
    expect(result.current.gs.state.pairingToken).toBe('TOK')
  })

  it('generateQr: no-op without elderId', async () => {
    const { result } = renderHandler()
    await act(async () => {
      await result.current.handler.generateQr()
    })
    expect(result.current.gs.state.qrDataUrl).toBeNull()
  })

  it('next: walks through the happy path', async () => {
    mockFetchSequence([
      // sendOtp
      { status: 200, body: { ref: 'R', expiresAt: new Date().toISOString() } },
      // verify
      { status: 200, body: { userId: 'u', role: 'caregiver' } },
      // caregiver
      { status: 200, body: { id: 'u', name: 'A' } },
      // consent
      { status: 200, body: { count: 3 } },
      // elder
      { status: 201, body: { id: 'E' } },
    ])
    const { result } = renderHandler()
    act(() => {
      result.current.form.setValue('phone', '0812345678')
      result.current.form.setValue('otp', '123456')
      result.current.form.setValue('caregiverName', 'A')
      result.current.form.setValue('relationship', 'ลูก')
      result.current.form.setValue('consentAudioAi', true)
      result.current.form.setValue('consentHealthData', true)
      result.current.form.setValue('elderName', 'ย่า')
      result.current.form.setValue('elderPhone', '0899999999')
      result.current.form.setValue('addressLine', 'a')
      result.current.form.setValue('district', 'd')
      result.current.form.setValue('province', 'p')
      result.current.form.setValue('postalCode', '10100')
    })
    // welcome → phone
    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('phone')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('otp')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('caregiver')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('consent')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderBasic')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderHealth')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderEmergency')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('elderOptional')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('review')

    await act(async () => {
      await result.current.handler.next()
    })
    expect(result.current.gs.state.step).toBe('qr')
  })
})
