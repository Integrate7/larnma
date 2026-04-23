import { z } from 'zod'

export const updateCaregiverBodySchema = z.object({
  name: z.string().trim().min(1),
  relationship: z.string().trim().min(1).optional(),
  profilePicUrl: z.string().url().optional(),
})

export const caregiverResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  role: z.literal('caregiver'),
  relationship: z.string().optional(),
  profilePicUrl: z.string().optional(),
})
