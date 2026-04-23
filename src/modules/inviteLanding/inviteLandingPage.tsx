'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import { Input } from '@/components/atom/input'
import { Skeleton } from '@/components/atom/skeleton'
import { FormField } from '@/components/molecule/formField'
import { OtpInput } from '@/components/molecule/otpInput'
import { useInviteLandingController } from './controller/controller'

export function InviteLandingPage({ token }: Readonly<{ token: string }>) {
  const t = useTranslations()
  const { form, state, handler } = useInviteLandingController(token)

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-5 py-8">
      <header
        className="border-b border-[var(--rule)] pb-3"
        data-testid="invite-landing-header"
      >
        <div className="mono-label">คำเชิญ</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {state.info?.inviterName ?? 'ผู้ดูแล'} เชิญคุณดูแล{' '}
          {state.info?.elderName ?? 'ผู้สูงอายุ'}
        </h1>
      </header>

      {state.loading ? <Skeleton className="h-12" /> : null}
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      {state.accepted ? (
        <div className="flex flex-col gap-3">
          <output className="text-xl text-[var(--brand-ink)]">
            ยอมรับเรียบร้อย
          </output>
          <Button asChild size="xl" className="w-full">
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

          {state.otpSent ? (
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
                className="w-full"
                data-testid="invite-accept"
              >
                {t('invite.accept')}
              </Button>
            </>
          ) : (
            <Button
              onClick={handler.sendOtp}
              loading={state.submitting}
              size="xl"
              className="w-full"
              data-testid="invite-send-otp"
            >
              ส่ง OTP
            </Button>
          )}
        </div>
      ) : null}
    </main>
  )
}
