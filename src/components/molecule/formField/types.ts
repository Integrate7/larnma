import type { ReactNode } from 'react'

export type FormFieldProps = Readonly<{
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}>
