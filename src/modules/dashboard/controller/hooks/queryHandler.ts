import { useCallback, useEffect } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { AudioEvent, Notification, Priority } from '@/shared/types'
import type { useDashboardGlobalState } from './globalState'

const audioEventSchema: z.ZodType<AudioEvent> = z.object({
  id: z.string(),
  elderId: z.string(),
  transcript: z.string(),
  mood: z.enum([
    'DANGER',
    'PAIN',
    'HUNGRY',
    'LONELY',
    'SAD',
    'HAPPY',
    'NORMAL',
  ]),
  intent: z.enum(['HUNGRY', 'PAIN', 'DANGER', 'LONELY', 'CHAT', 'UNKNOWN']),
  confidence: z.number(),
  summary: z.string(),
  entities: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
})

const notificationSchema: z.ZodType<Notification> = z.object({
  id: z.string(),
  eventId: z.string(),
  caregiverId: z.string(),
  priority: z.custom<Priority>(),
  readAt: z.string().optional(),
  ackAt: z.string().optional(),
  lockedByCaregiverId: z.string().optional(),
  escalated: z.boolean().optional(),
  createdAt: z.string(),
})

const listSchema = z.object({
  events: z.array(audioEventSchema),
  notifications: z.array(notificationSchema),
})

type GS = ReturnType<typeof useDashboardGlobalState>

export function useDashboardQueryHandler(gs: GS) {
  const load = useCallback(async () => {
    const res = await fetcher('/api/events', listSchema)
    if (res.success) {
      gs.replaceAll(res.data.events, res.data.notifications)
      gs.setError(null)
    } else {
      gs.setError(res.error)
    }
  }, [gs])

  useEffect(() => {
    void load()
  }, [load])

  return { reload: load }
}
