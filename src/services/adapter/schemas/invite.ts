import { z } from 'zod'
import { phoneSchema } from './auth'

export const createInviteBodySchema = z.object({
  elderId: z.string().min(1),
})

export const acceptInviteBodySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/),
  ref: z.string().min(1),
  name: z.string().trim().min(1),
  relationship: z.string().optional().default(''),
})

export const permissionsBodySchema = z.object({
  permissions: z.object({
    view_dashboard: z.boolean(),
    receive_noti: z.boolean(),
    reply_to_elder: z.boolean(),
    edit_elder_profile: z.boolean(),
    pay_food_orders: z.boolean(),
    decide_emergency: z.boolean(),
    redeem_points: z.boolean(),
    invite_caregivers: z.boolean(),
    transfer_primary: z.boolean(),
  }),
})
