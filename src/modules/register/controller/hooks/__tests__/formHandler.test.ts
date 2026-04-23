import { renderHook } from '@testing-library/react'
import { useRegisterFormHandler } from '../formHandler'

describe('useRegisterFormHandler', () => {
  it('returns form with defaults', () => {
    const { result } = renderHook(() => useRegisterFormHandler())
    expect(result.current.form.getValues('phone')).toBe('')
    expect(result.current.form.getValues('consentAudioAi')).toBe(false)
    expect(result.current.form.getValues('conditions')).toEqual([])
  })
})
