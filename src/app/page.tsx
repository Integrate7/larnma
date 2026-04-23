import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/atom/button'

export default async function HomePage() {
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
          <Link href="/elder">{t('elder.tapToSpeak')}</Link>
        </Button>
      </div>
    </main>
  )
}
