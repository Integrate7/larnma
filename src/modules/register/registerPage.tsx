'use client'

import { useEffect } from 'react'
import { Stepper } from '@/components/molecule/stepper'
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
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
      <Stepper current={stepIndex} total={REGISTER_STEPS.length} />
      {state.errorMessage ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.errorMessage}
        </p>
      ) : null}
      {state.step === 'welcome' ? (
        <WelcomeStep onNext={() => handler.next()} />
      ) : null}
      {state.step === 'choice' ? (
        <ChoiceStep onNext={() => handler.next()} onGoogle={() => handler.onGoogle()} />
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
