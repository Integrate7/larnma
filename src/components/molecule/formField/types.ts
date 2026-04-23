import type { ReactNode } from 'react'

export type FormFieldProps = {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}
