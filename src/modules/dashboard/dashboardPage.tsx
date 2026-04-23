'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { MoodChip } from '@/components/molecule/moodChip'
import { PriorityBadge } from '@/components/molecule/priorityBadge'
import { Button } from '@/components/atom/button'
import { useDashboardController } from './controller/controller'
import type { Mood } from '@/shared/types'

export function DashboardPage() {
  const t = useTranslations()
  const { state, handler } = useDashboardController()
  const latest = state.events[0]

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">{t('caregiver.dashboard.title')}</h1>

      {state.error ? (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('caregiver.dashboard.latestStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          {latest ? (
            <div
              className="flex flex-col gap-2"
              data-testid="dashboard-latest"
            >
              <div className="flex items-center gap-2">
                <MoodChip mood={latest.mood} />
                <span className="text-sm text-muted-foreground">
                  {new Date(latest.createdAt).toLocaleString('th-TH')}
                </span>
              </div>
              <p className="text-lg">{latest.summary}</p>
              <p className="text-sm text-muted-foreground">
                "{latest.transcript}"
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t('caregiver.dashboard.empty')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('caregiver.dashboard.timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="flex flex-col divide-y"
            data-testid="dashboard-timeline"
          >
            {state.events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <MoodChip mood={e.mood} />
                <span className="flex-1 text-sm">{e.summary}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleTimeString('th-TH')}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>การแจ้งเตือน</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y" data-testid="dashboard-notis">
            {state.notifications.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2">
                <PriorityBadge priority={n.priority} />
                <span className="flex-1 text-sm">{n.eventId}</span>
                {n.ackAt ? (
                  <span className="text-xs text-muted-foreground">ackแล้ว</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => void handler.ack(n.id)}
                    data-testid={`ack-${n.id}`}
                  >
                    {t('emergency.handleIt')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('caregiver.dashboard.weeklyMood')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(state.moodCounts) as Mood[]).map((m) => (
              <div
                key={m}
                className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
              >
                <MoodChip mood={m} />
                <span>{state.moodCounts[m]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
