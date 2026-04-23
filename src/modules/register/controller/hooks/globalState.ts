import { useState } from 'react'
import type { RegisterGlobalState, RegisterStep } from '../../types'
import { REGISTER_STEPS } from '../../types'

export function useRegisterGlobalState() {
  const [step, setStep] = useState<RegisterStep>('welcome')
  const [otpRef, setOtpRef] = useState<string | null>(null)
  const [elderId, setElderId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pairingToken, setPairingToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const state: RegisterGlobalState = {
    step,
    otpRef,
    elderId,
    qrDataUrl,
    pairingToken,
    submitting,
    errorMessage,
  }

  const goto = (next: RegisterStep) => setStep(next)
  const advance = () => {
    const idx = REGISTER_STEPS.indexOf(step)
    if (idx < REGISTER_STEPS.length - 1) setStep(REGISTER_STEPS[idx + 1])
  }
  const back = () => {
    const idx = REGISTER_STEPS.indexOf(step)
    if (idx > 0) setStep(REGISTER_STEPS[idx - 1])
  }

  return {
    state,
    goto,
    advance,
    back,
    setOtpRef,
    setElderId,
    setQrDataUrl,
    setPairingToken,
    setSubmitting,
    setErrorMessage,
  }
}
