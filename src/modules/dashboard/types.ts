import type { AudioEvent, ElderLocation, Mood, Notification } from '@/shared/types'

export type PairingInfo = {
  id: string
  elderId: string
  isPrimary: boolean
}

export type DashboardGlobalState = {
  events: AudioEvent[]
  notifications: Notification[]
  moodCounts: Record<Mood, number>
  connecting: boolean
  error: string | null
  pairings: PairingInfo[]
  locations: ElderLocation[]
}

export type DashboardHandler = {
  ack: (notificationId: string) => Promise<void>
  reload: () => Promise<void>
}
