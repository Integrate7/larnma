'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/atom/button'
import { QrImageUpload, QrScanner } from '@/components/molecule/qrScanner'
import { usePairController } from './controller/controller'

export function PairPage() {
  const t = useTranslations()
  const router = useRouter()
  const search = useSearchParams()
  const { state, handler } = usePairController()
  const autoConsumed = useRef(false)

  // If ?token=... is present, consume it directly (useful for tests + paste flow)
  useEffect(() => {
    const tokenParam = search.get('token')
    if (!tokenParam || autoConsumed.current) return
    autoConsumed.current = true
    void handler.consume(tokenParam)
  }, [search, handler])

  useEffect(() => {
    if (state.state === 'success') {
      const tid = setTimeout(() => router.replace('/elder'), 500)
      return () => clearTimeout(tid)
    }
  }, [state.state, router])

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-8">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">หลานม่า</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {t('pair.title')}
        </h1>
      </header>

      <section className="mt-6 flex flex-col items-center gap-4">
        <p className="serif-caption max-w-xs text-center">
          {t('pair.subtitle')}
        </p>

        {state.state === 'ready' ? (
          <div className="flex w-full flex-col gap-3">
            <Button
              onClick={handler.startScan}
              size="xl"
              data-testid="pair-start"
            >
              เปิดกล้อง
            </Button>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[var(--rule)]" />
              <span className="mono-label mx-4">หรือ</span>
              <div className="flex-grow border-t border-[var(--rule)]" />
            </div>
            <QrImageUpload
              onDecode={handler.onDecode}
              onError={handler.onError}
            />
          </div>
        ) : null}
        {state.state === 'scanning' ? (
          <div className="flex w-full flex-col items-center gap-4">
            <QrScanner onDecode={handler.onDecode} onError={handler.onError} />
            <span className="mono-label">กำลังหา QR…</span>
            <div className="w-full border-t border-[var(--rule)] pt-4">
              <QrImageUpload
                onDecode={handler.onDecode}
                onError={handler.onError}
              />
            </div>
          </div>
        ) : null}
        {state.state === 'pairing' ? (
          <p className="text-lg" data-testid="pair-pairing">
            {t('common.loading')}
          </p>
        ) : null}
        {state.state === 'success' ? (
          <p
            className="text-xl text-[var(--brand-ink)]"
            data-testid="pair-success"
          >
            {t('pair.success')}
          </p>
        ) : null}
        {state.state === 'error' && state.errorMessage ? (
          <div className="flex w-full flex-col items-center gap-3">
            <p
              role="alert"
              className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
            >
              {state.errorMessage}
            </p>
            <Button onClick={handler.startScan} size="xl" className="w-full">
              {t('common.retry')}
            </Button>
            <div className="relative flex w-full items-center py-2">
              <div className="flex-grow border-t border-[var(--rule)]" />
              <span className="mono-label mx-4">หรือ</span>
              <div className="flex-grow border-t border-[var(--rule)]" />
            </div>
            <QrImageUpload
              onDecode={handler.onDecode}
              onError={handler.onError}
            />
          </div>
        ) : null}
      </section>
    </main>
  )
}
