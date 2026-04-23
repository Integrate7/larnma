import type { AudioEvent, Notification } from '@/shared/types'

export type DashboardEvent =
  | { kind: 'audio'; event: AudioEvent }
  | { kind: 'notification'; notification: Notification }
  | { kind: 'ack'; notificationId: string; caregiverId: string }
  | { kind: 'order'; orderId: string; status: string }
  | { kind: 'point'; caregiverId: string; delta: number; balance: number }
  | { kind: 'heartbeat' }

type Listener = (e: DashboardEvent) => void

const listenersByCaregiver: Map<string, Set<Listener>> = new Map()

export function subscribe(caregiverId: string, listener: Listener): () => void {
  const set = listenersByCaregiver.get(caregiverId) ?? new Set()
  set.add(listener)
  listenersByCaregiver.set(caregiverId, set)
  return () => {
    const s = listenersByCaregiver.get(caregiverId)
    s?.delete(listener)
    if (s && s.size === 0) listenersByCaregiver.delete(caregiverId)
  }
}

export function publishTo(caregiverId: string, event: DashboardEvent): void {
  const set = listenersByCaregiver.get(caregiverId)
  if (!set) return
  for (const l of set) {
    try {
      l(event)
    } catch {
      // ignore individual listener errors
    }
  }
}

export function publishToAll(
  caregiverIds: Iterable<string>,
  event: DashboardEvent,
): void {
  for (const cid of caregiverIds) publishTo(cid, event)
}

export function listenerCount(caregiverId: string): number {
  return listenersByCaregiver.get(caregiverId)?.size ?? 0
}

export function resetEventBus(): void {
  listenersByCaregiver.clear()
}
