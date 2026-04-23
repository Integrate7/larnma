import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import type { inviteAcceptSchema } from './schema'

export type InviteInfo = {
  elderId: string
  elderName?: string
  inviterName?: string
  exp: string
}

export type InviteLandingState = {
  token: string
  info: InviteInfo | null
  loading: boolean
  error: string | null
  otpSent: boolean
  otpRef: string | null
  submitting: boolean
  accepted: boolean
}

export type InviteAcceptValues = z.infer<typeof inviteAcceptSchema>

export type InviteAcceptForm = UseFormReturn<InviteAcceptValues>
