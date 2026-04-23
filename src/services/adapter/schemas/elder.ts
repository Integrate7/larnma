import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  specialty: z.string().optional(),
  relation: z.string().optional(),
})

export const medicationSchema = z.object({
  name: z.string().trim().min(1),
  dosage: z.string().trim().min(1),
  time: z.string().trim().min(1),
})

export const elderBasicSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  birthdate: z.string().optional(),
  addressLine: z.string().trim().min(1),
  district: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  profilePicUrl: z.string().url().optional(),
})

export const elderHealthSchema = z.object({
  conditions: z.array(z.string()).default([]),
  symptoms: z.array(z.string()).default([]),
  medications: z.array(medicationSchema).default([]),
  allergies: z.array(z.string()).default([]),
})

export const elderEmergencySchema = z.object({
  hospitalContact: contactSchema.optional(),
  doctorContact: contactSchema.optional(),
  backupRelative: contactSchema.optional(),
})

export const elderOptionalSchema = z.object({
  bloodType: z.string().optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  foodPreferences: z.array(z.string()).default([]),
  foodDislikes: z.array(z.string()).default([]),
})

export const createElderBodySchema = z.object({
  basic: elderBasicSchema,
  health: elderHealthSchema,
  emergency: elderEmergencySchema,
  optional: elderOptionalSchema.optional(),
})

export const updateElderSectionBodySchema = z.object({
  section: z.enum(['basic', 'health', 'emergency', 'optional']),
  fields: z.record(z.string(), z.unknown()),
})

export const elderSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  birthdate: z.string().optional(),
})

export const elderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  birthdate: z.string().optional(),
  addressLine: z.string(),
  district: z.string(),
  province: z.string(),
  postalCode: z.string(),
  bloodType: z.string().optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  conditions: z.array(z.string()),
  symptoms: z.array(z.string()),
  medications: z.array(medicationSchema),
  allergies: z.array(z.string()),
  foodPreferences: z.array(z.string()),
  foodDislikes: z.array(z.string()),
  hospitalContact: contactSchema.optional(),
  doctorContact: contactSchema.optional(),
  backupRelative: contactSchema.optional(),
})
