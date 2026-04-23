import { useCallback, useMemo, useRef, useState } from 'react'
import type { AudioEvent, Notification } from '@/shared/types'
import type {
  CriticalAlertCase,
  CriticalAlertHandler,
  CriticalAlertState,
} from '../../types'
import { navigateToTel } from './telNavigation'

type PrimaryElder = { name: string | null; phone: string | null } | null

export function useCriticalAlerts(
  notifications: ReadonlyArray<Notification>,
  events: ReadonlyArray<AudioEvent>,
  primaryElder: PrimaryElder,
  ackFn: (notificationId: string) => Promise<void>,
): CriticalAlertState & CriticalAlertHandler {
  const shownCaseIdsRef = useRef<Set<string>>(new Set())
  const [shownVersion, bumpShownVersion] = useState(0)

  const cases = useMemo<CriticalAlertCase[]>(() => {
    const out: CriticalAlertCase[] = []
    for (const n of notifications) {
      if (n.priority !== 'critical' && n.priority !== 'high') continue
      if (n.ackAt) continue
      if (shownCaseIdsRef.current.has(n.id)) continue
      const ev = events.find((e) => e.id === n.eventId)
      out.push({
        id: n.id,
        eventId: n.eventId,
        priority: n.priority,
        transcript: ev?.transcript ?? '',
        summary: ev?.summary ?? '',
        createdAt: n.createdAt,
      })
    }
    return out
    // shownVersion is bumped by markCurrentAsShown to invalidate this memo
    // whenever shownCaseIdsRef mutates (refs alone don't retrigger memos).
  }, [notifications, events, shownVersion])

  const tone: CriticalAlertState['tone'] = cases.some(
    (c) => c.priority === 'critical',
  )
    ? 'critical'
    : 'high'

  const elderName = primaryElder?.name ?? null
  const elderPhone = primaryElder?.phone ?? null

  const markCurrentAsShown = useCallback(() => {
    for (const c of cases) shownCaseIdsRef.current.add(c.id)
    bumpShownVersion((v) => v + 1)
  }, [cases])

  const onClose = useCallback(() => {
    markCurrentAsShown()
  }, [markCurrentAsShown])

  const onCallElder = useCallback(() => {
    if (!elderPhone) return
    void Promise.allSettled(cases.map((c) => ackFn(c.id))).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('ack failed', r.reason)
      }
    })
    markCurrentAsShown()
    navigateToTel(elderPhone)
  }, [ackFn, cases, elderPhone, markCurrentAsShown])

  const onCall1669 = useCallback(() => {
    void Promise.allSettled(cases.map((c) => ackFn(c.id))).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('ack failed', r.reason)
      }
    })
    markCurrentAsShown()
    navigateToTel('1669')
  }, [ackFn, cases, markCurrentAsShown])

  return {
    open: cases.length > 0,
    cases,
    tone,
    elderName,
    elderPhone,
    onCallElder,
    onCall1669,
    onClose,
  }
}
