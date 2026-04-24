import type {
  AudioEvent,
  ElderLocation,
  Mood,
  Notification,
  Pairing,
} from '@/shared/types'

export type PairingInfo = Pick<Pairing, 'id' | 'elderId' | 'isPrimary'> & {
  elderName: string | null
  elderPhone: string | null
}

export type DashboardGlobalState = {
  events: AudioEvent[]
  notifications: Notification[]
  moodCounts: Record<Mood, number>
  connecting: boolean
  error: string | null
  pairings: PairingInfo[]
  locations: ElderLocation[]
  orderedEventIds: string[]
  orderStatuses: Record<string, string>
}

export type MenuSuggestion = {
  id: string
  name: string
  price: number
  allergyMatch: string[]
  isSafe: boolean
}

export type DashboardHandler = {
  ack: (notificationId: string) => Promise<void>
  order: (notification: Notification, events: AudioEvent[], menuId: string) => Promise<void>
  reload: () => Promise<void>
}

export type CriticalAlertCase = Readonly<{
  id: string // notification id
  eventId: string
  priority: 'critical' | 'high'
  transcript: string // '' when the matching AudioEvent hasn't arrived yet
  summary: string // '' when the matching AudioEvent hasn't arrived yet
  createdAt: string
}>

export type CriticalAlertTone = 'critical' | 'high'

export type CriticalAlertState = Readonly<{
  open: boolean
  cases: ReadonlyArray<CriticalAlertCase>
  tone: CriticalAlertTone
  elderName: string | null
  elderPhone: string | null
}>

export type CriticalAlertHandler = Readonly<{
  onCallElder: () => void
  onCall1669: () => void
  onClose: () => void
}>

export type CriticalAlertDialogProps = CriticalAlertState & CriticalAlertHandler
