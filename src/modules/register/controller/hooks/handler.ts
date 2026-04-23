import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { RegisterForm, RegisterHandler } from '../../types'
import type { useRegisterGlobalState } from './globalState'

type GS = ReturnType<typeof useRegisterGlobalState>

export function useRegisterHandler(args: {
  form: RegisterForm
  gs: GS
}): RegisterHandler {
  const { form, gs } = args

  const setBusy = (b: boolean) => gs.setSubmitting(b)
  const setErr = (m: string | null) => gs.setErrorMessage(m)

  const sendOtp = async () => {
    const phone = form.getValues('phone')
    const ok = await form.trigger('phone')
    if (!ok) return
    setBusy(true)
    setErr(null)
    const res = await fetcher(
      '/api/auth/otp/send',
      z.object({ ref: z.string(), expiresAt: z.string() }),
      { method: 'POST', body: { phone } },
    )
    setBusy(false)
    if (!res.success) return setErr(res.error)
    gs.setOtpRef(res.data.ref)
    gs.goto('otp')
  }

  const verifyOtp = async () => {
    const ok = await form.trigger('otp')
    if (!ok) return
    if (!gs.state.otpRef) return setErr('ยังไม่ได้ส่งรหัส OTP')
    setBusy(true)
    setErr(null)
    const res = await fetcher(
      '/api/auth/otp/verify',
      z.object({ userId: z.string(), role: z.string() }),
      {
        method: 'POST',
        body: {
          phone: form.getValues('phone'),
          code: form.getValues('otp'),
          ref: gs.state.otpRef,
        },
      },
    )
    setBusy(false)
    if (!res.success) return setErr(res.error)
    gs.goto('caregiver')
  }

  const submitCaregiver = async () => {
    const ok = await form.trigger(['caregiverName', 'relationship'])
    if (!ok) return
    setBusy(true)
    setErr(null)
    const res = await fetcher(
      '/api/caregivers/me',
      z.object({ id: z.string(), name: z.string() }),
      {
        method: 'PATCH',
        body: { name: form.getValues('caregiverName') },
      },
    )
    setBusy(false)
    if (!res.success) return setErr(res.error)
    gs.goto('consent')
  }

  const submitConsent = async () => {
    const v = form.getValues()
    if (!v.consentAudioAi || !v.consentHealthData) {
      setErr('ต้องยินยอมทั้ง 2 ข้อเพื่อใช้งาน')
      return
    }
    setBusy(true)
    setErr(null)
    const res = await fetcher(
      '/api/consents',
      z.object({ count: z.number() }),
      {
        method: 'POST',
        body: {
          items: [
            { type: 'audio_ai', granted: v.consentAudioAi },
            { type: 'health_data', granted: v.consentHealthData },
            { type: 'marketing', granted: v.consentMarketing },
          ],
        },
      },
    )
    setBusy(false)
    if (!res.success) return setErr(res.error)
    gs.goto('elderBasic')
  }

  const submitElder = async () => {
    const ok = await form.trigger([
      'elderName',
      'elderPhone',
      'addressLine',
      'district',
      'province',
      'postalCode',
    ])
    if (!ok) return
    const v = form.getValues()
    setBusy(true)
    setErr(null)
    const res = await fetcher(
      '/api/elders',
      z.object({ id: z.string() }),
      {
        method: 'POST',
        body: {
          basic: {
            name: v.elderName,
            phone: v.elderPhone,
            birthdate: v.birthdate || undefined,
            addressLine: v.addressLine,
            district: v.district,
            province: v.province,
            postalCode: v.postalCode,
          },
          health: {
            conditions: v.conditions,
            symptoms: v.symptoms,
            medications: v.medications,
            allergies: v.allergies,
          },
          emergency: {
            hospitalContact: v.hospitalName
              ? { name: v.hospitalName, phone: v.hospitalPhone || '' }
              : undefined,
            doctorContact: v.doctorName
              ? { name: v.doctorName, phone: v.doctorPhone || '' }
              : undefined,
            backupRelative: v.backupName
              ? { name: v.backupName, phone: v.backupPhone || '' }
              : undefined,
          },
          optional: {
            bloodType: v.bloodType || undefined,
            heightCm: typeof v.heightCm === 'number' && !Number.isNaN(v.heightCm)
              ? v.heightCm
              : undefined,
            weightKg: typeof v.weightKg === 'number' && !Number.isNaN(v.weightKg)
              ? v.weightKg
              : undefined,
            foodPreferences: v.foodPreferences,
            foodDislikes: v.foodDislikes,
          },
        },
      },
    )
    setBusy(false)
    if (!res.success) return setErr(res.error)
    gs.setElderId(res.data.id)
    gs.goto('qr')
  }

  const generateQr = async () => {
    if (!gs.state.elderId) return
    setBusy(true)
    setErr(null)
    const res = await fetcher(
      '/api/pairings/qr',
      z.object({
        qrDataUrl: z.string(),
        token: z.string(),
        exp: z.string(),
      }),
      { method: 'POST', body: { elderId: gs.state.elderId } },
    )
    setBusy(false)
    if (!res.success) return setErr(res.error)
    gs.setQrDataUrl(res.data.qrDataUrl)
    gs.setPairingToken(res.data.token)
  }

  const next = async () => {
    const step = gs.state.step
    if (step === 'welcome') gs.goto('phone')
    else if (step === 'phone') await sendOtp()
    else if (step === 'otp') await verifyOtp()
    else if (step === 'caregiver') await submitCaregiver()
    else if (step === 'consent') await submitConsent()
    else if (step === 'elderBasic') {
      const ok = await form.trigger([
        'elderName',
        'elderPhone',
        'addressLine',
        'district',
        'province',
        'postalCode',
      ])
      if (!ok) return
      gs.goto('elderHealth')
    }
    else if (step === 'elderHealth') gs.goto('elderEmergency')
    else if (step === 'elderEmergency') {
      const ok = await form.trigger(['hospitalPhone', 'doctorPhone', 'backupPhone'])
      if (!ok) return
      gs.goto('elderOptional')
    }
    else if (step === 'elderOptional') gs.goto('review')
    else if (step === 'review') await submitElder()
  }

  return {
    next,
    back: gs.back,
    sendOtp,
    verifyOtp,
    submitCaregiver,
    submitConsent,
    submitElder,
    generateQr,
  }
}
