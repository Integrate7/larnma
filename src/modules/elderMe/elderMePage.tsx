'use client'

import { ArrowLeft, Phone } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/atom/badge'
import { Button } from '@/components/atom/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/atom/card'
import { Skeleton } from '@/components/atom/skeleton'
import { useElderMeController } from './controller/controller'

export function ElderMePage() {
  const t = useTranslations()
  const { state } = useElderMeController()

  return (
    <main className="elder-mode mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-5 py-6">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">ข้อมูลของฉัน</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {state.data?.name ?? t('elder.myInfo')}
        </h1>
      </header>

      {state.loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24" />
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.data ? (
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="mono-label">ติดต่อ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl">
                โทร: <a href={`tel:${state.data.phone}`}>{state.data.phone}</a>
              </p>
              {state.data.birthdate ? (
                <p>วันเกิด: {state.data.birthdate}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mono-label">โรคประจำตัว</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {state.data.conditions.length === 0 ? (
                <span className="text-muted-foreground">-</span>
              ) : (
                state.data.conditions.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mono-label">ยาที่ทาน</CardTitle>
            </CardHeader>
            <CardContent>
              {state.data.medications.length === 0 ? (
                <p className="text-muted-foreground">-</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {state.data.medications.map((m) => (
                    <li key={`${m.name}-${m.time}`} className="text-xl">
                      {m.name} — {m.dosage} ({m.time})
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mono-label">แพ้อะไร</CardTitle>
            </CardHeader>
            <CardContent>
              {state.data.allergies.length === 0 ? (
                <p className="text-muted-foreground">-</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.data.allergies.map((a) => (
                    <Badge key={a} variant="destructive">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mono-label">ที่อยู่</CardTitle>
            </CardHeader>
            <CardContent className="text-xl">
              {state.data.addressLine} {state.data.district}{' '}
              {state.data.province} {state.data.postalCode}
            </CardContent>
          </Card>

          {state.data.primaryCaregiver ? (
            <Button asChild size="xl" variant="default">
              <a
                href={`tel:${state.data.primaryCaregiver.phone}`}
                data-testid="elder-me-call-primary"
              >
                <Phone className="mr-2 h-6 w-6" />
                {t('elder.callGrandchild')} ({state.data.primaryCaregiver.name})
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      <Button asChild size="xl" variant="outline">
        <Link href="/elder">
          <ArrowLeft className="mr-2 h-5 w-5" />
          {t('elder.back')}
        </Link>
      </Button>
    </main>
  )
}
