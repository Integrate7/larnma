import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { registerDefaults, registerFormSchema } from '../../schema'
import type { RegisterForm, RegisterFormValues } from '../../types'

export function useRegisterFormHandler(): { form: RegisterForm } {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: registerDefaults as RegisterFormValues,
    mode: 'onBlur',
  })

  useEffect(() => {
    const prefillName = localStorage.getItem('prefill_name')
    if (prefillName) {
      form.setValue('caregiverName', prefillName)
      // Clear after use so it doesn't stick forever
      localStorage.removeItem('prefill_name')
      localStorage.removeItem('prefill_email')
      localStorage.removeItem('prefill_firstName')
      localStorage.removeItem('prefill_lastName')
    }
  }, [form])

  return { form }
}
