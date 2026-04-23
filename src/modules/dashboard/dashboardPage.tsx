'use client'

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Button } from '@/components/atom/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/atom/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atom/dialog'
import { MoodChip } from '@/components/molecule/moodChip'
import { PriorityBadge } from '@/components/molecule/priorityBadge'
import type { Mood, Notification } from '@/shared/types'
import { useDashboardController } from './controller/controller'
import { InviteSection } from './views/inviteSection/inviteSection'

const ElderMap = dynamic(
  () => import('@/components/molecule/elderMap').then((m) => m.ElderMap),
  { ssr: false },
)

type PendingOrder = {
  notification: Notification
  menuId: string
  menuName: string
  allergyMatch: string[]
}

export function DashboardPage() {
  const t = useTranslations()
  const { state, handler } = useDashboardController()
  const latest = state.events[0]
  const primary = state.pairings.find((p) => p.isPrimary)
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null)

  const handleMenuClick = (
    notification: Notification,
    menu: {
      id: string
      name: string
      price: number
      allergyMatch: string[]
      isSafe: boolean
    },
  ) => {
    if (!menu.isSafe && menu.allergyMatch.length > 0) {
      setPendingOrder({
        notification,
        menuId: menu.id,
        menuName: menu.name,
        allergyMatch: menu.allergyMatch,
      })
    } else {
      void handler.order(notification, state.events, menu.id)
    }
  }

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
              <p className="text-lg font-medium">"{latest.transcript}"</p>
              <p className="text-sm text-muted-foreground">{latest.summary}</p>
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
                <span className="flex-1 text-sm">
                  "{e.transcript}"
                  <span className="ml-1 text-muted-foreground">
                    — {e.summary}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleTimeString('th-TH')}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <InviteSection elderId={primary?.elderId ?? ''} isPrimary={!!primary} />

      <Card>
        <CardHeader>
          <CardTitle>การแจ้งเตือน</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y" data-testid="dashboard-notis">
            {state.notifications.map((n) => {
              const event = state.events.find((e) => e.id === n.eventId)
              const isHungry = event?.intent === 'HUNGRY'
              const alreadyOrdered = event
                ? state.orderedEventIds.includes(event.id)
                : false
              const suggestions =
                isHungry && event
                  ? ((
                      event.entities as {
                        menuSuggestions?: {
                          id: string
                          name: string
                          price: number
                          allergyMatch: string[]
                          isSafe: boolean
                        }[]
                      }
                    ).menuSuggestions ?? [])
                  : []
              const notiKey = n.id
              return (
                <li key={notiKey} className="flex flex-col gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={n.priority} />
                    <span className="flex-1 text-sm">
                      {event ? (
                        <>
                          <span className="font-medium">
                            "{event.transcript}"
                          </span>
                          <span className="ml-1 text-muted-foreground">
                            — {event.summary}
                          </span>
                        </>
                      ) : (
                        n.eventId
                      )}
                    </span>
                    {!n.ackAt ? (
                      <Button
                        size="sm"
                        onClick={() => void handler.ack(n.id)}
                        data-testid={`ack-${n.id}`}
                      >
                        {t('emergency.handleIt')}
                      </Button>
                    ) : alreadyOrdered ? (
                      <span className="text-xs text-green-600">
                        {t('food.paid')}
                      </span>
                    ) : !isHungry ? (
                      <span className="text-xs text-muted-foreground">
                        รับทราบแล้ว
                      </span>
                    ) : null}
                  </div>

                  {n.ackAt &&
                  isHungry &&
                  !alreadyOrdered &&
                  suggestions.length > 0 ? (
                    <div className="ml-8 flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">
                        {t('food.suggestTitle')} — เลือกเมนูที่จะสั่ง:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((menu) => {
                          const isUnsafe =
                            !menu.isSafe && menu.allergyMatch.length > 0
                          return (
                            <Button
                              key={menu.id}
                              size="sm"
                              variant={isUnsafe ? 'destructive' : 'outline'}
                              onClick={() => handleMenuClick(n, menu)}
                              data-testid={`order-menu-${menu.id}`}
                            >
                              {isUnsafe && (
                                <AlertTriangle className="mr-1 h-3 w-3" />
                              )}
                              {menu.name} ฿{menu.price}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('caregiver.dashboard.location')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ElderMap locations={state.locations} />
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

      <Dialog
        open={!!pendingOrder}
        onOpenChange={(open) => {
          if (!open) setPendingOrder(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              แจ้งเตือนอาหารแพ้
            </DialogTitle>
            <DialogDescription>
              เมนู{' '}
              <span className="font-medium text-foreground">
                "{pendingOrder?.menuName}"
              </span>{' '}
              มีส่วนผสม{' '}
              <span className="font-medium text-destructive">
                {pendingOrder?.allergyMatch.join(', ')}
              </span>{' '}
              ซึ่งตรงกับรายการแพ้อาหารของผู้สูงอายุ
              <br />
              คุณต้องการสั่งต่อหรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingOrder(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-allergic-order"
              onClick={() => {
                if (pendingOrder) {
                  void handler.order(
                    pendingOrder.notification,
                    state.events,
                    pendingOrder.menuId,
                  )
                  setPendingOrder(null)
                }
              }}
            >
              ยืนยันสั่งต่อ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
