import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'เบอร์ต้องเป็น 10 หลัก ขึ้นต้นด้วย 0')

export const sendOtpBodySchema = z.object({
  phone: phoneSchema,
})

export const verifyOtpBodySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'รหัส 6 หลัก'),
  ref: z.string().min(1),
})

export const sendOtpResponseSchema = z.object({
  ref: z.string(),
  expiresAt: z.string(),
})

export const verifyOtpResponseSchema = z.object({
  userId: z.string(),
  role: z.enum(['caregiver', 'elder']),
})
