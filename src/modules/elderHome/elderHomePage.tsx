'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, User } from 'lucide-react'
import { Button } from '@/components/atom/button'
import { MicButton } from '@/components/molecule/micButton'
import { MoodChip } from '@/components/molecule/moodChip'
import { useTranslations } from 'next-intl'
import { useElderHomeController } from './controller/controller'

export function ElderHomePage() {
  const t = useTranslations()
  const { state, handler } = useElderHomeController()

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void fetch('/api/elder/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        })
      },
      () => {
        /* silently ignore — permission denied or unavailable */
      },
    )
  }, [])

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
        <div className="flex flex-col items-center gap-2" data-testid="elder-last-result">
          <MoodChip mood={state.lastResult.mood} />
          <p className="text-xl text-foreground">{state.lastResult.summary}</p>
          {state.lastResult.advice ? (
            <p className="max-w-md text-center text-lg text-muted-foreground" data-testid="elder-advice">
              {state.lastResult.advice}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.orderNotification ? (
        <div
          className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl bg-green-50 p-5 text-center"
          data-testid="elder-order-delivered"
        >
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-2xl font-bold text-green-800">
            {state.orderNotification.caregiverName} สั่ง {state.orderNotification.menuName} ให้แล้วนะคะ
          </p>
          <p className="text-lg text-green-700">กำลังจัดส่ง ถึงใน 30 นาที</p>
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
