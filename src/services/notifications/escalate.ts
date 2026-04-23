import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { getRepository } from '@/services/repository'
import type { Notification } from '@/shared/types'

/**
 * Returns the list of critical notifications that have not been ack'd within
 * the escalation window and have not yet been flagged as `escalated`. This is
 * a pure (ish) function — callers trigger any actual re-broadcast via the
 * dashboard bus. The repo is updated so we only escalate once per event.
 */
export function findAndFlagEscalations(nowMs: number = Date.now()): Notification[] {
  const repo = getRepository()
  const windowMs = ADAPTER_CONFIG.escalationSec * 1000
  const out: Notification[] = []
  // We scan all critical notifications via caregiver lists — acceptable for in-memory
  // as the repository does not expose a global listing. Callers can provide the
  // caregiver id set explicitly for efficiency in production.
  const caregivers = new Set<string>()
  const noti = (repo as unknown as {
    __listCaregiverIds?: () => string[]
  }).__listCaregiverIds
  if (typeof noti !== 'function') return out

  for (const cid of noti()) caregivers.add(cid)
  for (const cid of caregivers) {
    repo
      .listNotificationsByCaregiver(cid, 200)
      .filter(
        (n) =>
          n.priority === 'critical' &&
          !n.escalated &&
          !n.ackAt &&
          nowMs - new Date(n.createdAt).getTime() >= windowMs,
      )
      .forEach((n) => {
        const updated = repo.updateNotification(n.id, { escalated: true })
        if (updated) out.push(updated)
      })
  }
  return out
}
