export type InviteSectionProps = {
  elderId: string
  isPrimary: boolean
}

export type InviteGlobalState = {
  open: boolean
  inviteUrl: string | null
  loading: boolean
  error: string | null
  copied: boolean
}

export type InviteHandler = {
  openDialog: () => Promise<void>
  close: () => void
  copyLink: () => Promise<void>
  shareViaLine: () => void
  shareViaSms: () => void
}
