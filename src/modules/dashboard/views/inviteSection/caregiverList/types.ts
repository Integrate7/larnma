export type CaregiverItem = {
  pairingId: string
  name: string
  phone: string
  isPrimary: boolean
  isCurrentUser: boolean
}

export type CaregiverListGlobalState = {
  caregivers: CaregiverItem[]
  loading: boolean
  error: string | null
}

export type CaregiverListHandler = {
  load: () => Promise<void>
  revoke: (pairingId: string) => Promise<void>
}

export type CaregiverListProps = {
  elderId: string
}

export type CaregiverListViewProps = {
  caregivers: CaregiverItem[]
  loading: boolean
  error: string | null
  onRevoke: (pairingId: string) => void
}
