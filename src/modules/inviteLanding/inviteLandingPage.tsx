'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { Input } from '@/components/atom/input'
import { FormField } from '@/components/molecule/formField'
import { OtpInput } from '@/components/molecule/otpInput'
import { Skeleton } from '@/components/atom/skeleton'
import { useInviteLandingController } from './controller/controller'

export function InviteLandingPage({ token }: { token: string }) {
  const t = useTranslations()
  const { form, state, handler } = useInviteLandingController(token)

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('invite.landingTitle', { inviter: '...', elder: '...' })}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.loading ? <Skeleton className="h-12" /> : null}
          {state.error ? (
            <p role="alert" className="text-destructive">
              {state.error}
            </p>
          ) : null}
          {state.info ? (
            <p className="text-lg" data-testid="invite-landing-header">
              {state.info.inviterName ?? 'ผู้ดูแล'} เชิญคุณดูแล{' '}
              <strong>{state.info.elderName ?? 'ผู้สูงอายุ'}</strong>
            </p>
          ) : null}

          {state.accepted ? (
            <div className="flex flex-col gap-3">
              <p role="status" className="text-xl text-primary">
                ยอมรับเรียบร้อย
              </p>
              <Button asChild size="xl">
                <Link href="/dashboard" data-testid="invite-go-dashboard">
                  ไปที่แดชบอร์ด
                </Link>
              </Button>
            </div>
          ) : null}

          {!state.accepted && state.info ? (
            <div className="flex flex-col gap-3">
              <FormField
                label="เบอร์โทรของคุณ"
                htmlFor="inv-phone"
                required
                error={form.formState.errors.phone?.message}
              >
                <Input
                  id="inv-phone"
                  type="tel"
                  {...form.register('phone')}
                  disabled={state.otpSent}
                />
              </FormField>

              {!state.otpSent ? (
                <Button
                  onClick={handler.sendOtp}
                  loading={state.submitting}
                  size="xl"
                  data-testid="invite-send-otp"
                >
                  ส่ง OTP
                </Button>
              ) : (
                <>
                  <FormField
                    label="รหัส OTP"
                    error={form.formState.errors.otp?.message}
                  >
                    <OtpInput
                      value={form.watch('otp') ?? ''}
                      onChange={(v) =>
                        form.setValue('otp', v, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    label="ชื่อของคุณ"
                    htmlFor="inv-name"
                    required
                    error={form.formState.errors.name?.message}
                  >
                    <Input id="inv-name" {...form.register('name')} />
                  </FormField>
                  <FormField label="ความสัมพันธ์" htmlFor="inv-relation">
                    <Input
                      id="inv-relation"
                      {...form.register('relationship')}
                      placeholder="เช่น ลูก, หลาน"
                    />
                  </FormField>
                  <Button
                    onClick={handler.accept}
                    loading={state.submitting}
                    size="xl"
                    data-testid="invite-accept"
                  >
                    {t('invite.accept')}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
