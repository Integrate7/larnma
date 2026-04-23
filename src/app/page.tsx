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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">{t('common.appName')}</h1>
      <p className="text-muted-foreground">{t('tagline')}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="xl">
          <Link href="/register">{t('welcome.startButton')}</Link>
        </Button>
        <Button asChild size="xl" variant="outline">
          <Link href="/elder/pair">{t('welcome.scanQrButton')}</Link>
        </Button>
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t('welcome.elderHint')}
      </p>
    </main>
  )
}
