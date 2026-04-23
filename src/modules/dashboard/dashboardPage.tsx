'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/atom/card'
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
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t('caregiver.dashboard.title')}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            คุณแม่วันนี้
          </h1>
        </div>
        <div
          className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
          style={{ background: 'var(--brand)' }}
        >
          ห
        </div>
      </header>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="mono-label">Mood</div>
          <div className="mt-1 text-base font-semibold tracking-tight">
            {state.events[0]?.mood ?? 'ปกติ'}
          </div>
        </Card>
        <Card className="p-3">
          <div className="mono-label">Events</div>
          <div className="mt-1 text-base font-semibold tracking-tight">
            {state.events.length} ครั้ง
          </div>
        </Card>
      </div>

      {/* Latest event */}
      <section className="flex flex-col gap-2">
        <div className="mono-label">
          {t('caregiver.dashboard.latestStatus')}
        </div>
        {latest ? (
          <Card accent="log" className="p-3" data-testid="dashboard-latest">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="mono-label">
                  {new Date(latest.createdAt).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <MoodChip mood={latest.mood} />
              </div>
              <span className="mono-label">latest</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-[var(--ink)]">
              "{latest.transcript}"
            </p>
            <p className="mt-1 serif-caption">{latest.summary}</p>
          </Card>
        ) : (
          <p className="serif-caption">{t('caregiver.dashboard.empty')}</p>
        )}
      </section>

      {/* Timeline */}
      <section className="flex flex-col gap-2" data-testid="dashboard-timeline">
        <div className="mono-label">{t('caregiver.dashboard.timeline')}</div>
        {state.events.map((e) => (
          <Card key={e.id} accent="log" className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="mono-label">
                  {new Date(e.createdAt).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <MoodChip mood={e.mood} />
              </div>
              <span className="mono-label">log</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-[var(--ink)]">
              "{e.transcript}"
            </p>
            <p className="mt-1 serif-caption">{e.summary}</p>
          </Card>
        ))}
      </section>

      {/* Notifications - PRESERVES the food-order logic */}
      <section className="flex flex-col gap-2" data-testid="dashboard-notis">
        <div className="mono-label">การแจ้งเตือน</div>
        {state.notifications.map((n) => {
          const event = state.events.find((e) => e.id === n.eventId)
          const isHungry = event?.intent === 'HUNGRY'
          const alreadyOrdered = event
            ? state.orderedEventIds.includes(event.id)
            : false
          return (
            <Card
              key={n.id}
              accent={n.priority === 'critical' ? 'crit' : 'normal'}
              className="p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2">
                  <PriorityBadge priority={n.priority} />
                  <span className="text-sm text-[var(--ink)]">
                    {event?.summary ?? n.eventId}
                  </span>
                  {isHungry && event ? (
                    <span className="mono-label">
                      ฿{(event.entities as { price?: number }).price ?? '-'}
                    </span>
                  ) : null}
                </div>
                {!n.ackAt ? (
                  <Button
                    size="sm"
                    onClick={() => void handler.ack(n.id)}
                    data-testid={`ack-${n.id}`}
                  >
                    {t('emergency.handleIt')}
                  </Button>
                ) : isHungry && !alreadyOrdered ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => void handler.order(n, state.events)}
                    data-testid={`order-${n.id}`}
                  >
                    {t('food.pay')}
                  </Button>
                ) : alreadyOrdered ? (
                  <span
                    className="mono-label"
                    style={{ color: 'var(--ok)' }}
                  >
                    {t('food.paid')}
                  </span>
                ) : (
                  <span className="mono-label">ackแล้ว</span>
                )}
              </div>
            </Card>
          )
        })}
      </section>

      {/* Weekly mood */}
      <section className="flex flex-col gap-2">
        <div className="mono-label">{t('caregiver.dashboard.weeklyMood')}</div>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(state.moodCounts) as Mood[]).map((m) => (
            <div
              key={m}
              className="flex items-center gap-2 rounded-md border border-[var(--rule)] bg-white px-3 py-1.5"
            >
              <MoodChip mood={m} />
              <span className="font-mono text-sm">{state.moodCounts[m]}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
