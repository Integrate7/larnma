import { act, renderHook } from '@testing-library/react'
import { useRegisterFormHandler } from '../formHandler'

describe('useRegisterFormHandler', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns form with defaults', () => {
    const { result } = renderHook(() => useRegisterFormHandler())
    expect(result.current.form.getValues('phone')).toBe('')
    expect(result.current.form.getValues('consentAudioAi')).toBe(false)
    expect(result.current.form.getValues('conditions')).toEqual([])
  })

  it('returns form with all default fields', () => {
    const { result } = renderHook(() => useRegisterFormHandler())
    const form = result.current.form
    expect(form.getValues('otp')).toBe('')
    expect(form.getValues('caregiverName')).toBe('')
    expect(form.getValues('elderName')).toBe('')
    expect(form.getValues('allergies')).toEqual([])
    expect(form.getValues('medications')).toEqual([])
  })

  it('prefills caregiverName from localStorage when prefill_name is set', async () => {
    localStorage.setItem('prefill_name', 'ทดสอบ')
    const { result } = renderHook(() => useRegisterFormHandler())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(result.current.form.getValues('caregiverName')).toBe('ทดสอบ')
    expect(localStorage.getItem('prefill_name')).toBeNull()
  })

  it('clears prefill keys after use', async () => {
    localStorage.setItem('prefill_name', 'ทดสอบ')
    localStorage.setItem('prefill_email', 'test@test.com')
    localStorage.setItem('prefill_firstName', 'ทด')
    localStorage.setItem('prefill_lastName', 'สอบ')
    renderHook(() => useRegisterFormHandler())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(localStorage.getItem('prefill_email')).toBeNull()
    expect(localStorage.getItem('prefill_firstName')).toBeNull()
    expect(localStorage.getItem('prefill_lastName')).toBeNull()
  })

  it('does not set caregiverName when no prefill_name in localStorage', () => {
    const { result } = renderHook(() => useRegisterFormHandler())
    expect(result.current.form.getValues('caregiverName')).toBe('')
  })
})
