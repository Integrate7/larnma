import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { InviteAcceptForm } from '../../types'
import type { useInviteLandingGlobalState } from './globalState'

type GS = ReturnType<typeof useInviteLandingGlobalState>

export function useInviteLandingHandler(args: {
  form: InviteAcceptForm
  gs: GS
}) {
  const { form, gs } = args

  const sendOtp = async () => {
    const ok = await form.trigger('phone')
    if (!ok) return
    gs.setSubmitting(true)
    gs.setError(null)
    const res = await fetcher(
      '/api/auth/otp/send',
      z.object({ ref: z.string(), expiresAt: z.string() }),
      { method: 'POST', body: { phone: form.getValues('phone') } },
    )
    gs.setSubmitting(false)
    if (!res.success) return gs.setError(res.error)
    gs.setOtpRef(res.data.ref)
    gs.setOtpSent(true)
  }

  const accept = async () => {
    const ok = await form.trigger(['phone', 'otp', 'name'])
    if (!ok) return
    if (!gs.state.otpRef) {
      gs.setError('ยังไม่ได้ส่งรหัส OTP')
      return
    }
    gs.setSubmitting(true)
    gs.setError(null)
    const res = await fetcher(
      `/api/invites/${gs.state.token}/accept`,
      z.object({ pairingId: z.string(), caregiverId: z.string() }),
      {
        method: 'POST',
        body: {
          phone: form.getValues('phone'),
          code: form.getValues('otp'),
          ref: gs.state.otpRef,
          name: form.getValues('name'),
          relationship: form.getValues('relationship'),
        },
      },
    )
    gs.setSubmitting(false)
    if (!res.success) return gs.setError(res.error)
    gs.setAccepted(true)
  }

  return { sendOtp, accept }
}
