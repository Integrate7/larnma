import { z } from 'zod'

export const createPairingQrBodySchema = z.object({
  elderId: z.string().min(1),
})

export const pairingQrResponseSchema = z.object({
  qrDataUrl: z.string(),
  token: z.string(),
  exp: z.string(),
})

export const consumePairingBodySchema = z.object({
  token: z.string().min(1),
  deviceFingerprint: z.string().min(1),
})
