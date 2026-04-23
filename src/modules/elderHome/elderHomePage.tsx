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
    <main className="elder-mode relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="absolute left-4 top-4">
        <Button
          asChild
          size="icon"
          variant="outline"
          aria-label={t('elder.myInfo')}
        >
          <Link href="/elder/me" data-testid="elder-me-link">
            <User className="h-6 w-6" />
          </Link>
        </Button>
      </div>

      <MicButton state={state.micState} onPress={handler.onPress} />

      {state.lastResult ? (
        <div
          className="flex flex-col items-center gap-2"
          data-testid="elder-last-result"
        >
          <MoodChip mood={state.lastResult.mood} />
          <p className="text-xl text-foreground">{state.lastResult.summary}</p>
          {state.lastResult.advice ? (
            <p
              className="max-w-md text-center text-lg text-muted-foreground"
              data-testid="elder-advice"
            >
              {state.lastResult.advice}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.errorMessage ? (
        <p role="alert" className="text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      {!state.isOnline ? (
        <Button asChild size="xl" variant="destructive">
          <a href="tel:1669" data-testid="elder-offline-call">
            {t('emergency.call1669')}
          </a>
        </Button>
      ) : null}
    </main>
  )
}
