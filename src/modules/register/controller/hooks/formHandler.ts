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
  return { form }
}
