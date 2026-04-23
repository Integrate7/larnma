import { useState } from 'react'
import type { InviteInfo, InviteLandingState } from '../../types'

export function useInviteLandingGlobalState(token: string) {
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpRef, setOtpRef] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const state: InviteLandingState = {
    token,
    info,
    loading,
    error,
    otpSent,
    otpRef,
    submitting,
    accepted,
  }

  return {
    state,
    setInfo,
    setLoading,
    setError,
    setOtpSent,
    setOtpRef,
    setSubmitting,
    setAccepted,
  }
}
