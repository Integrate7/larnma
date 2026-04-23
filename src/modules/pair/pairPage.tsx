'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/atom/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { QrScanner } from '@/components/molecule/qrScanner'
import { useTranslations } from 'next-intl'
import { usePairController } from './controller/controller'

export function PairPage() {
  const t = useTranslations()
  const router = useRouter()
  const { state, handler } = usePairController()

  useEffect(() => {
    if (state.state === 'success') {
      const tid = setTimeout(() => router.replace('/elder'), 500)
      return () => clearTimeout(tid)
    }
  }, [state.state, router])

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('pair.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-lg text-muted-foreground">
            {t('pair.subtitle')}
          </p>
          {state.state === 'ready' ? (
            <Button onClick={handler.startScan} size="xl" data-testid="pair-start">
              เปิดกล้อง
            </Button>
          ) : null}
          {state.state === 'scanning' ? (
            <QrScanner onDecode={handler.onDecode} onError={handler.onError} />
          ) : null}
          {state.state === 'pairing' ? (
            <p className="text-lg">{t('common.loading')}</p>
          ) : null}
          {state.state === 'success' ? (
            <p className="text-xl text-primary">{t('pair.success')}</p>
          ) : null}
          {state.state === 'error' && state.errorMessage ? (
            <div className="flex flex-col items-center gap-3">
              <p role="alert" className="text-destructive">
                {state.errorMessage}
              </p>
              <Button onClick={handler.startScan} size="xl">
                {t('common.retry')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
