import { useMemo, useState } from 'react'
import type {
  AudioEvent,
  ElderLocation,
  Mood,
  Notification,
  Priority,
} from '@/shared/types'
import type { DashboardGlobalState, PairingInfo } from '../../types'
import { MOODS } from '@/shared/types'

export function useDashboardGlobalState() {
  const [events, setEvents] = useState<AudioEvent[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connecting, setConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pairings, setPairings] = useState<PairingInfo[]>([])
  const [locations, setLocations] = useState<ElderLocation[]>([])

  const moodCounts = useMemo<Record<Mood, number>>(() => {
    const out = Object.fromEntries(MOODS.map((m) => [m, 0])) as Record<
      Mood,
      number
    >
    for (const e of events) out[e.mood] += 1
    return out
  }, [events])

  const state: DashboardGlobalState = {
    events,
    notifications,
    moodCounts,
    connecting,
    error,
    pairings,
    locations,
  }

  const prependEvent = (e: AudioEvent) =>
    setEvents((prev) => {
      if (prev.some((x) => x.id === e.id)) return prev
      return [e, ...prev].slice(0, 50)
    })

  const prependNotification = (n: Notification) =>
    setNotifications((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev
      return [n, ...prev].slice(0, 50)
    })

  const updateNotification = (id: string, patch: Partial<Notification>) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    )

  const replaceAll = (events: AudioEvent[], notis: Notification[]) => {
    setEvents(events)
    setNotifications(notis)
  }

  void ({} as Priority) // keep import alive when tree-shaken

  return {
    state,
    setConnecting,
    setError,
    setPairings,
    setLocations,
    prependEvent,
    prependNotification,
    updateNotification,
    replaceAll,
  }
}
