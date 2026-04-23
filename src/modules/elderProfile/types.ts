import type { ElderMe } from '@/modules/elderMe/types'

export type ElderProfileData = ElderMe

export type ElderProfileState = {
  elderId: string
  data: ElderProfileData | null
  loading: boolean
  error: string | null
  saving: boolean
  saved: boolean
}
