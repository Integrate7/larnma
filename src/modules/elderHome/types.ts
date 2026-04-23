import type { MicButtonState } from '@/components/molecule/micButton'
import type { Intent, Mood } from '@/shared/types'

export type { MicButtonState }

export type AudioUploadResult = {
  eventId: string
  transcript: string
  mood: Mood
  intent: Intent
  summary: string
  advice?: string
}

export type ElderHomeGlobalState = {
  micState: MicButtonState
  lastResult: AudioUploadResult | null
  errorMessage: string | null
  isOnline: boolean
}
