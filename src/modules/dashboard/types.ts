import type { AudioEvent, Mood, Notification } from '@/shared/types'

export type DashboardGlobalState = {
  events: AudioEvent[]
  notifications: Notification[]
  moodCounts: Record<Mood, number>
  connecting: boolean
  error: string | null
  orderedEventIds: string[]
}

export type DashboardHandler = {
  ack: (notificationId: string) => Promise<void>
  order: (notification: Notification, events: AudioEvent[]) => Promise<void>
  reload: () => Promise<void>
}
