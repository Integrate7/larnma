import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/atom/button'
import { getServerAuth } from '@/services/guards/serverAuth'

export default async function HomePage() {
  const auth = await getServerAuth()
  if (auth?.role === 'caregiver') redirect('/dashboard')
  if (auth?.role === 'elder') redirect('/elder')

  const t = await getTranslations()

  return (
    <main className="relative mx-auto flex min-h-screen max-w-xl flex-col gap-10 px-6 py-8">
      <header className="flex items-center gap-2 border-b border-[var(--rule)] pb-3">
        <span className="brand-mark">ล</span>
        <span className="text-sm font-semibold tracking-tight">
          Larnma · หลานม่า
        </span>
      </header>
      <section className="flex flex-col items-start gap-3">
        <div className="mono-label">หลานม่า · voice-first</div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {t('common.appName')}
        </h1>
        <p
          className="serif-caption text-base leading-relaxed"
          style={{ color: 'var(--ink-2)' }}
        >
          {t('tagline')}
        </p>
        <div className="mt-4 flex w-full flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/register">{t('welcome.startButton')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/elder/pair">{t('welcome.scanQrButton')}</Link>
          </Button>
        </div>
        <p className="serif-caption mt-3 max-w-sm">{t('welcome.elderHint')}</p>
      </section>
      <footer className="mono-label mt-auto border-t border-[var(--rule)] pt-3">
        <b>Larnma</b> · v0.1 · MVP
      </footer>
    </main>
  )
}
