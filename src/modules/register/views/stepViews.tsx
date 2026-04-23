'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import { Input } from '@/components/atom/input'
import { Textarea } from '@/components/atom/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { FormField } from '@/components/molecule/formField'
import { OtpInput } from '@/components/molecule/otpInput'
import { ConsentToggle } from '@/components/molecule/consentToggle'
import { QrDisplay } from '@/components/molecule/qrDisplay'
import type { RegisterForm } from '../types'

type StepProps = {
  form: RegisterForm
  onNext: () => void | Promise<void>
  onBack: () => void
  submitting: boolean
}

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t('welcome.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-muted-foreground">{t('welcome.subtitle')}</p>
        <Button onClick={onNext} size="xl" data-testid="welcome-next">
          {t('welcome.startButton')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function PhoneStep({ form, onNext, submitting }: StepProps) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.phoneTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormField
          label={t('common.required')}
          htmlFor="phone"
          error={form.formState.errors.phone?.message}
        >
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder={t('auth.phonePlaceholder')}
            {...form.register('phone')}
          />
        </FormField>
        <Button
          onClick={onNext}
          loading={submitting}
          size="xl"
          data-testid="phone-next"
        >
          {t('auth.sendOtp')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function OtpStep({
  form,
  onNext,
  onBack,
  submitting,
}: StepProps & { phone: string }) {
  const t = useTranslations()
  const otp = form.watch('otp')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.otpTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-muted-foreground">
          {t('auth.otpSubtitle', { phone: form.getValues('phone') })}
        </p>
        <OtpInput
          value={otp ?? ''}
          onChange={(v) =>
            form.setValue('otp', v, { shouldValidate: true, shouldDirty: true })
          }
          autoFocus
        />
        {form.formState.errors.otp ? (
          <p className="text-xs text-destructive" role="alert">
            {form.formState.errors.otp.message}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} size="xl">
            {t('common.back')}
          </Button>
          <Button
            onClick={onNext}
            loading={submitting}
            size="xl"
            data-testid="otp-next"
            className="flex-1"
          >
            {t('auth.verifyOtp')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function CaregiverStep({ form, onNext, submitting }: StepProps) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('caregiver.profile.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormField
          label={t('caregiver.profile.name')}
          htmlFor="caregiverName"
          required
          error={form.formState.errors.caregiverName?.message}
        >
          <Input id="caregiverName" {...form.register('caregiverName')} />
        </FormField>
        <FormField
          label={t('caregiver.profile.relationship')}
          htmlFor="relationship"
          required
          error={form.formState.errors.relationship?.message}
        >
          <Input
            id="relationship"
            placeholder={t('caregiver.profile.relationshipPlaceholder')}
            {...form.register('relationship')}
          />
        </FormField>
        <Button
          onClick={onNext}
          loading={submitting}
          size="xl"
          data-testid="caregiver-next"
        >
          {t('common.next')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ConsentStep({ form, onNext, submitting }: StepProps) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.consentTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ConsentToggle
          id="consent-audio-ai"
          label={t('register.consent.audioAi')}
          required
          checked={form.watch('consentAudioAi')}
          onChange={(v) => form.setValue('consentAudioAi', v)}
        />
        <ConsentToggle
          id="consent-health"
          label={t('register.consent.healthData')}
          required
          checked={form.watch('consentHealthData')}
          onChange={(v) => form.setValue('consentHealthData', v)}
        />
        <ConsentToggle
          id="consent-marketing"
          label={t('register.consent.marketing')}
          checked={form.watch('consentMarketing')}
          onChange={(v) => form.setValue('consentMarketing', v)}
        />
        <Button
          onClick={onNext}
          loading={submitting}
          size="xl"
          data-testid="consent-next"
        >
          {t('common.next')}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ElderBasicStep({
  form,
  onNext,
  onBack,
  submitting,
}: StepProps) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.elderBasic')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormField
          label="ชื่อผู้สูงอายุ"
          htmlFor="elderName"
          required
          error={form.formState.errors.elderName?.message}
        >
          <Input id="elderName" {...form.register('elderName')} />
        </FormField>
        <FormField
          label="เบอร์ผู้สูงอายุ"
          htmlFor="elderPhone"
          required
          error={form.formState.errors.elderPhone?.message}
        >
          <Input id="elderPhone" type="tel" {...form.register('elderPhone')} />
        </FormField>
        <FormField
          label="วันเกิด"
          htmlFor="birthdate"
        >
          <Input id="birthdate" type="date" {...form.register('birthdate')} />
        </FormField>
        <FormField
          label="ที่อยู่"
          htmlFor="addressLine"
          required
          error={form.formState.errors.addressLine?.message}
        >
          <Textarea id="addressLine" rows={2} {...form.register('addressLine')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="อำเภอ/เขต"
            htmlFor="district"
            required
            error={form.formState.errors.district?.message}
          >
            <Input id="district" {...form.register('district')} />
          </FormField>
          <FormField
            label="จังหวัด"
            htmlFor="province"
            required
            error={form.formState.errors.province?.message}
          >
            <Input id="province" {...form.register('province')} />
          </FormField>
        </div>
        <FormField
          label="รหัสไปรษณีย์"
          htmlFor="postalCode"
          required
          error={form.formState.errors.postalCode?.message}
        >
          <Input id="postalCode" {...form.register('postalCode')} />
        </FormField>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} size="xl">
            {t('common.back')}
          </Button>
          <Button
            onClick={onNext}
            loading={submitting}
            size="xl"
            className="flex-1"
            data-testid="elder-basic-next"
          >
            {t('common.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function csv(form: RegisterForm, field: 'conditions' | 'symptoms' | 'allergies' | 'foodPreferences' | 'foodDislikes') {
  const list = form.watch(field) ?? []
  return {
    value: (list as string[]).join(', '),
    set: (raw: string) =>
      form.setValue(
        field,
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
  }
}

export function ElderHealthStep({ form, onNext, onBack }: StepProps) {
  const t = useTranslations()
  const conditions = csv(form, 'conditions')
  const symptoms = csv(form, 'symptoms')
  const allergies = csv(form, 'allergies')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.elderHealth')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormField label="โรคประจำตัว (คั่นด้วย ,)" hint="เช่น เบาหวาน, ความดัน">
          <Input
            value={conditions.value}
            onChange={(e) => conditions.set(e.target.value)}
          />
        </FormField>
        <FormField label="อาการที่พบบ่อย">
          <Input
            value={symptoms.value}
            onChange={(e) => symptoms.set(e.target.value)}
          />
        </FormField>
        <FormField label="แพ้อะไร">
          <Input
            value={allergies.value}
            onChange={(e) => allergies.set(e.target.value)}
          />
        </FormField>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} size="xl">
            {t('common.back')}
          </Button>
          <Button onClick={onNext} size="xl" className="flex-1">
            {t('common.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ElderEmergencyStep({ form, onNext, onBack }: StepProps) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.elderEmergency')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="โรงพยาบาล">
            <Input {...form.register('hospitalName')} placeholder="ชื่อ รพ." />
          </FormField>
          <FormField label="เบอร์" error={form.formState.errors.hospitalPhone?.message}>
            <Input {...form.register('hospitalPhone')} type="tel" inputMode="numeric" />
          </FormField>
          <FormField label="หมอประจำ">
            <Input {...form.register('doctorName')} />
          </FormField>
          <FormField label="เบอร์หมอ" error={form.formState.errors.doctorPhone?.message}>
            <Input {...form.register('doctorPhone')} type="tel" inputMode="numeric" />
          </FormField>
          <FormField label="ญาติสำรอง">
            <Input {...form.register('backupName')} />
          </FormField>
          <FormField label="เบอร์ญาติ" error={form.formState.errors.backupPhone?.message}>
            <Input {...form.register('backupPhone')} type="tel" inputMode="numeric" />
          </FormField>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} size="xl">
            {t('common.back')}
          </Button>
          <Button onClick={onNext} size="xl" className="flex-1">
            {t('common.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ElderOptionalStep({ form, onNext, onBack }: StepProps) {
  const t = useTranslations()
  const prefs = csv(form, 'foodPreferences')
  const dislikes = csv(form, 'foodDislikes')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.elderOptional')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="กรุ๊ปเลือด">
            <Input {...form.register('bloodType')} placeholder="A / B / O / AB" />
          </FormField>
          <FormField label="ส่วนสูง (ซม.)">
            <Input
              type="number"
              {...form.register('heightCm', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="น้ำหนัก (กก.)">
            <Input
              type="number"
              {...form.register('weightKg', { valueAsNumber: true })}
            />
          </FormField>
        </div>
        <FormField label="อาหารที่ชอบ">
          <Input value={prefs.value} onChange={(e) => prefs.set(e.target.value)} />
        </FormField>
        <FormField label="อาหารที่ไม่ชอบ">
          <Input
            value={dislikes.value}
            onChange={(e) => dislikes.set(e.target.value)}
          />
        </FormField>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} size="xl">
            {t('common.back')}
          </Button>
          <Button onClick={onNext} size="xl" className="flex-1">
            {t('common.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReviewStep({ form, onNext, onBack, submitting }: StepProps) {
  const v = form.getValues()
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.review')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          <strong>ผู้ดูแล:</strong> {v.caregiverName} ({v.relationship})
        </p>
        <p>
          <strong>ผู้สูงอายุ:</strong> {v.elderName} ({v.elderPhone})
        </p>
        <p>
          <strong>ที่อยู่:</strong> {v.addressLine} {v.district} {v.province}{' '}
          {v.postalCode}
        </p>
        <p>
          <strong>โรคประจำตัว:</strong> {v.conditions.join(', ') || '-'}
        </p>
        <p>
          <strong>แพ้:</strong> {v.allergies.join(', ') || '-'}
        </p>
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack} size="xl">
            {t('common.back')}
          </Button>
          <Button
            onClick={onNext}
            loading={submitting}
            size="xl"
            className="flex-1"
            data-testid="review-submit"
          >
            {t('common.confirm')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function QrStep({
  qrDataUrl,
  pairingToken,
  onGenerate,
}: {
  qrDataUrl: string | null
  pairingToken: string | null
  onGenerate: () => void
}) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.qrTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {t('register.qrSubtitle')}
        </p>
        {qrDataUrl ? (
          <QrDisplay
            value={pairingToken ?? ''}
            dataUrl={qrDataUrl}
            size={280}
            alt="pairing QR"
          />
        ) : (
          <Button onClick={onGenerate} size="xl" data-testid="qr-generate">
            สร้าง QR
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
