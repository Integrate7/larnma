'use client'

import { useEffect } from 'react'
import { REGISTER_STEPS } from './types'
import { useRegisterController } from './controller/controller'
import {
  CaregiverStep,
  WelcomeStep,
  ChoiceStep,
  PhoneStep,
  ConsentStep,
  ElderBasicStep,
  ElderEmergencyStep,
  ElderHealthStep,
  ElderOptionalStep,
  OtpStep,
  QrStep,
  ReviewStep,
} from './views/stepViews'

export function RegisterPage() {
  const { form, state, handler } = useRegisterController()
  const stepIndex = REGISTER_STEPS.indexOf(state.step) + 1

  // Auto-generate QR once we arrive at the qr step
  useEffect(() => {
    if (state.step === 'qr' && !state.qrDataUrl) {
      void handler.generateQr()
    }
  }, [state.step, state.qrDataUrl, handler])

  const props = {
    form,
    onNext: handler.next,
    onBack: handler.back,
    submitting: state.submitting,
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-5 py-6">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">
          Step {stepIndex}/{REGISTER_STEPS.length}
        </div>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">
          {state.step === 'qr' ? 'QR pairing' : 'ลงทะเบียน'}
        </h1>
      </header>
      {state.errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
        >
          {state.errorMessage}
        </p>
      ) : null}
      {state.step === 'welcome' ? (
        <WelcomeStep onNext={() => handler.next()} />
      ) : null}
      {state.step === 'choice' ? (
        <ChoiceStep
          onNext={() => handler.next()}
          onGoogle={() => handler.onGoogle()}
        />
      ) : null}
      {state.step === 'phone' ? <PhoneStep {...props} /> : null}

      {state.step === 'otp' ? (
        <OtpStep {...props} phone={form.getValues('phone')} />
      ) : null}
      {state.step === 'caregiver' ? <CaregiverStep {...props} /> : null}
      {state.step === 'consent' ? <ConsentStep {...props} /> : null}
      {state.step === 'elderBasic' ? <ElderBasicStep {...props} /> : null}
      {state.step === 'elderHealth' ? <ElderHealthStep {...props} /> : null}
      {state.step === 'elderEmergency' ? <ElderEmergencyStep {...props} /> : null}
      {state.step === 'elderOptional' ? <ElderOptionalStep {...props} /> : null}
      {state.step === 'review' ? <ReviewStep {...props} /> : null}
      {state.step === 'qr' ? (
        <QrStep
          qrDataUrl={state.qrDataUrl}
          pairingToken={state.pairingToken}
          onGenerate={handler.generateQr}
        />
      ) : null}
    </main>
  )
}
