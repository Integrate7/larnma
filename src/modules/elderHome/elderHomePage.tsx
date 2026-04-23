'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { Button } from '@/components/atom/button'
import { MicButton } from '@/components/molecule/micButton'
import { MoodChip } from '@/components/molecule/moodChip'
import { useTranslations } from 'next-intl'
import { useElderHomeController } from './controller/controller'

export function ElderHomePage() {
  const t = useTranslations()
  const { state, handler } = useElderHomeController()

  return (
    <main className="elder-mode relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="absolute left-4 top-4">
        <Button asChild size="icon" variant="outline" aria-label={t('elder.myInfo')}>
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
        </div>
      ) : null}

      {state.errorMessage ? (
        <p role="alert" className="text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      <Button asChild size="xl" variant="destructive">
        <a href="tel:0863780740" data-testid="elder-emergency-call">
          {t('emergency.call1669')}
        </a>
      </Button>
    </main>
  )
}
