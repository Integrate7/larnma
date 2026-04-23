'use client'

import { User } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import { MicButton } from '@/components/molecule/micButton'
import { MoodChip } from '@/components/molecule/moodChip'
import { useElderHomeController } from './controller/controller'

export function ElderHomePage() {
  const t = useTranslations()
  const { state, handler } = useElderHomeController()

  return (
    <main className="elder-mode relative flex min-h-screen flex-col items-center justify-between bg-background px-6 pb-6 pt-16">
      <div className="absolute left-4 top-4">
        <Button
          asChild
          size="icon"
          variant="outline"
          aria-label={t('elder.myInfo')}
        >
          <Link href="/elder/me" data-testid="elder-me-link">
            <User className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <MicButton state={state.micState} onPress={handler.onPress} />

        {state.lastResult ? (
          <div
            className="flex max-w-sm flex-col items-center gap-2 rounded-xl border border-[color-mix(in_oklch,var(--brand)_22%,transparent)] bg-[var(--brand-wash)] px-4 py-3"
            data-testid="elder-last-result"
          >
            <MoodChip mood={state.lastResult.mood} />
            <p
              className="text-base font-medium text-[var(--ink)]"
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
              }}
            >
              {state.lastResult.summary}
            </p>
            {state.lastResult.advice ? (
              <p
                className="serif-caption text-center"
                data-testid="elder-advice"
              >
                {state.lastResult.advice}
              </p>
            ) : null}
          </div>
        ) : null}

        {state.errorMessage ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="serif-caption text-center">
          Wake word{' '}
          <b style={{ fontStyle: 'normal', color: 'var(--brand-ink)' }}>
            "หลานม่า"
          </b>{' '}
          เปิดอยู่
        </p>
        <Button
          asChild
          size="xl"
          className="w-full bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
        >
          <a href="tel:0863780740" data-testid="elder-emergency-call">
            {t('emergency.call1669')}
          </a>
        </Button>
      </div>
    </main>
  )
}
