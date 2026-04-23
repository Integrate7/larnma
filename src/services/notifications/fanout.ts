import { getRepository } from '@/services/repository'
import { MOOD_PRIORITY } from '@/shared/types'
import type { AudioEvent, Notification, Priority } from '@/shared/types'

export function priorityForEvent(event: AudioEvent): Priority {
  return MOOD_PRIORITY[event.mood]
}

export function fanOutEvent(event: AudioEvent): Notification[] {
  const repo = getRepository()
  const priority = priorityForEvent(event)
  if (priority === 'log') return []
  const pairings = repo.listPairingsByElder(event.elderId)
  const created: Notification[] = []
  for (const p of pairings) {
    if (!p.permissions.receive_noti) continue
    const n = repo.createNotification({
      eventId: event.id,
      caregiverId: p.caregiverId,
      priority,
    })
    created.push(n)
  }
  return created
}
