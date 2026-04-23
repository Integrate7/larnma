import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import type { registerFormSchema } from './schema'

export type RegisterStep =
  | 'welcome'
  | 'phone'
  | 'otp'
  | 'caregiver'
  | 'consent'
  | 'elderBasic'
  | 'elderHealth'
  | 'elderEmergency'
  | 'elderOptional'
  | 'review'
  | 'qr'

export const REGISTER_STEPS: RegisterStep[] = [
  'welcome',
  'phone',
  'otp',
  'caregiver',
  'consent',
  'elderBasic',
  'elderHealth',
  'elderEmergency',
  'elderOptional',
  'review',
  'qr',
]

export type RegisterFormValues = z.infer<typeof registerFormSchema>

export type RegisterForm = UseFormReturn<RegisterFormValues>

export type RegisterGlobalState = {
  step: RegisterStep
  otpRef: string | null
  elderId: string | null
  qrDataUrl: string | null
  pairingToken: string | null
  submitting: boolean
  errorMessage: string | null
}

export type RegisterHandler = {
  next: () => Promise<void> | void
  back: () => void
  sendOtp: () => Promise<void>
  verifyOtp: () => Promise<void>
  submitCaregiver: () => Promise<void>
  submitConsent: () => Promise<void>
  submitElder: () => Promise<void>
  generateQr: () => Promise<void>
}
