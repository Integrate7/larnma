import type { Medication } from '@/shared/types'

export type ElderMe = {
  id: string
  name: string
  phone: string
  profilePicUrl?: string
  birthdate?: string
  addressLine: string
  district: string
  province: string
  postalCode: string
  conditions: string[]
  medications: Medication[]
  allergies: string[]
  primaryCaregiver?: { id: string; name: string; phone: string }
}

export type ElderMeState = {
  data: ElderMe | null
  loading: boolean
  error: string | null
}
