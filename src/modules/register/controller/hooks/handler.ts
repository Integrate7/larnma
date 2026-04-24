import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { RegisterForm, RegisterHandler } from '../../types'
import type { useRegisterGlobalState } from './globalState'

type GS = ReturnType<typeof useRegisterGlobalState>

export function useRegisterHandler(args: {
  form: RegisterForm
  gs: GS
  navigate?: (url: string) => void
}): RegisterHandler {
  const { form, gs, navigate = (url) => globalThis.window.location.assign(url) } = args

  const setBusy = (b: boolean) => gs.setSubmitting(b)
  const setErr = (m: string | null) => gs.setErrorMessage(m)

  const EMERGENCY_PAIRS = [
    ['hospitalName', 'hospitalPhone'],
    ['doctorName', 'doctorPhone'],
    ['backupName', 'backupPhone'],
  ] as const

  const validateEmergency = (): boolean => {
    const v = form.getValues()
    let ok = true
    for (const [nameKey, phoneKey] of EMERGENCY_PAIRS) {
      const name = (v[nameKey] ?? '').trim()
      const phone = (v[phoneKey] ?? '').trim()
      form.clearErrors([nameKey, phoneKey])
      if (phone && !/^0\d{9}$/.test(phone)) {
        form.setError(phoneKey, {
          type: 'custom',
          message: 'เบอร์ต้องเป็น 10 หลัก',
        })
        ok = false
        continue
      }
      if (name && !phone) {
        form.setError(phoneKey, { type: 'custom', message: 'กรุณากรอกเบอร์โทร' })
        ok = false
      } else if (phone && !name) {
        form.setError(nameKey, { type: 'custom', message: 'กรุณากรอกชื่อ' })
        ok = false
      }
    }
    return ok
  }

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
    if (!validateEmergency()) return
    const v = form.getValues()
    setBusy(true)
    setErr(null)
    const res = await fetcher('/api/elders', z.object({ id: z.string() }), {
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
          heightCm:
            typeof v.heightCm === 'number' && !Number.isNaN(v.heightCm)
              ? v.heightCm
              : undefined,
          weightKg:
            typeof v.weightKg === 'number' && !Number.isNaN(v.weightKg)
              ? v.weightKg
              : undefined,
          foodPreferences: v.foodPreferences,
          foodDislikes: v.foodDislikes,
        },
      },
    })
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

  const onGoogle = () => {
    navigate('/api/auth/google')
  }

  const downloadQr = () => {
    const qrDataUrl = gs.state.qrDataUrl
    if (!qrDataUrl) return
    // Convert the displayed data URL into a real PNG Blob. iOS Safari and some
    // Android WebViews open raw `data:` download links inline instead of saving
    // them, which yields a "downloaded" file the scanner can't read.
    const match = qrDataUrl.match(/^data:(.+?);base64,(.+)$/)
    if (!match) return
    const [, mime, b64] = match
    const binary = globalThis.atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const objectUrl = URL.createObjectURL(blob)
    const elderId = gs.state.elderId
    const filename = `larnma-pairing-${elderId ?? 'qr'}.png`
    const anchor = globalThis.document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  }

  const goToDashboard = () => {
    navigate('/dashboard')
  }

  const next = async () => {
    const step = gs.state.step
    if (step === 'welcome') gs.goto('choice')
    else if (step === 'choice') gs.goto('phone')
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
    } else if (step === 'elderHealth') gs.goto('elderEmergency')
    else if (step === 'elderEmergency') {
      if (!validateEmergency()) return
      gs.goto('elderOptional')
    } else if (step === 'elderOptional') gs.goto('review')
    else if (step === 'review') await submitElder()
  }

  return {
    next,
    back: gs.back,
    onGoogle,
    sendOtp,
    verifyOtp,
    submitCaregiver,
    submitConsent,
    submitElder,
    generateQr,
    downloadQr,
    goToDashboard,
  }
}
