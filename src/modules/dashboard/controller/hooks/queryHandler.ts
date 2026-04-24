import { useCallback, useEffect, useRef } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type {
  AudioEvent,
  ElderLocation,
  Notification,
  Priority,
} from '@/shared/types'
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

const pairingsSchema = z.array(
  z.object({
    id: z.string(),
    elderId: z.string(),
    isPrimary: z.boolean(),
    elderName: z.string().nullable(),
    elderPhone: z.string().nullable(),
  }),
)

const locationSchema: z.ZodType<ElderLocation> = z.object({
  elderId: z.string(),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  capturedAt: z.string(),
})

const locationsSchema = z.object({
  locations: z.array(locationSchema),
})

type GS = ReturnType<typeof useDashboardGlobalState>

export function useDashboardQueryHandler(gs: GS) {
  // Keep the latest gs behind a ref so load() stays reference-stable. Depending
  // directly on `gs` makes load fire on every render (gs is a fresh object
  // literal) → useEffect([load]) → setState → rerender → infinite refetch.
  const gsRef = useRef(gs)
  gsRef.current = gs

  const load = useCallback(async () => {
    const [eventsRes, locationsRes, pairingsRes] = await Promise.all([
      fetcher('/api/events', listSchema),
      fetcher('/api/elders/location', locationsSchema),
      fetcher('/api/pairings/me', pairingsSchema),
    ])
    if (eventsRes.success) {
      gsRef.current.replaceAll(eventsRes.data.events, eventsRes.data.notifications)
      gsRef.current.setError(null)
    } else {
      gsRef.current.setError(eventsRes.error)
    }
    if (locationsRes.success) {
      gsRef.current.setLocations(locationsRes.data.locations)
    }
    if (pairingsRes.success) {
      gsRef.current.setPairings(pairingsRes.data)
    }
    // pairings fetch failure is intentionally silent — hides invite button (pairings stays [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { reload: load }
}
