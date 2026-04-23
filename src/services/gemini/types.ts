import type { Intent, Mood } from '@/shared/types'

export type GeminiInput = {
  audio?: Blob
  hintKeyword?: string
  locale?: string
}

export type GeminiAnalysis = {
  transcript: string
  intent: Intent
  mood: Mood
  confidence: number
  summary: string
  advice?: string
  entities: Record<string, unknown>
}

export type GeminiAdapter = {
  analyze: (input: GeminiInput) => Promise<GeminiAnalysis>
}
