import { z } from 'zod'

export const CONSENT_TYPES = ['audio_ai', 'health_data', 'marketing'] as const

export const consentItemSchema = z.object({
  type: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
})

export const consentBodySchema = z.object({
  items: z.array(consentItemSchema).min(1),
})
