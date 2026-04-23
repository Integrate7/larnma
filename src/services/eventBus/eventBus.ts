import type { AudioEvent, Notification } from '@/shared/types'

export type DashboardEvent =
  | { kind: 'audio'; event: AudioEvent }
  | { kind: 'notification'; notification: Notification }
  | { kind: 'ack'; notificationId: string; caregiverId: string }
  | { kind: 'order'; orderId: string; status: string }
  | { kind: 'point'; caregiverId: string; delta: number; balance: number }
  | { kind: 'heartbeat' }

export type ElderEvent =
  | { kind: 'order_delivered'; orderId: string; menuName: string; caregiverName: string }
  | { kind: 'heartbeat' }

type CaregiverListener = (e: DashboardEvent) => void
type ElderListener = (e: ElderEvent) => void

const listenersByCaregiver: Map<string, Set<CaregiverListener>> = new Map()
const listenersByElder: Map<string, Set<ElderListener>> = new Map()

export function subscribe(caregiverId: string, listener: CaregiverListener): () => void {
  const set = listenersByCaregiver.get(caregiverId) ?? new Set()
  set.add(listener)
  listenersByCaregiver.set(caregiverId, set)
  return () => {
    const s = listenersByCaregiver.get(caregiverId)
    s?.delete(listener)
    if (s && s.size === 0) listenersByCaregiver.delete(caregiverId)
  }
}

export function subscribeElder(elderId: string, listener: ElderListener): () => void {
  const set = listenersByElder.get(elderId) ?? new Set()
  set.add(listener)
  listenersByElder.set(elderId, set)
  return () => {
    const s = listenersByElder.get(elderId)
    s?.delete(listener)
    if (s && s.size === 0) listenersByElder.delete(elderId)
  }
}

export function publishTo(caregiverId: string, event: DashboardEvent): void {
  const set = listenersByCaregiver.get(caregiverId)
  if (!set) return
  for (const l of set) {
    try { l(event) } catch { /* ignore */ }
  }
}

export function publishToAll(
  caregiverIds: Iterable<string>,
  event: DashboardEvent,
): void {
  for (const cid of caregiverIds) publishTo(cid, event)
}

export function publishToElder(elderId: string, event: ElderEvent): void {
  const set = listenersByElder.get(elderId)
  if (!set) return
  for (const l of set) {
    try { l(event) } catch { /* ignore */ }
  }
}

export function listenerCount(caregiverId: string): number {
  return listenersByCaregiver.get(caregiverId)?.size ?? 0
}

export function resetEventBus(): void {
  listenersByCaregiver.clear()
  listenersByElder.clear()
}
