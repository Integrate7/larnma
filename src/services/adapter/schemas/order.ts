import { z } from 'zod'

export const orderItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
})

export const createOrderBodySchema = z.object({
  elderId: z.string().min(1),
  eventId: z.string().min(1),
  menu: z.array(orderItemSchema).min(1),
})

export const orderResponseSchema = z.object({
  id: z.string(),
  status: z.enum([
    'pending',
    'paid',
    'preparing',
    'delivering',
    'delivered',
    'cancelled',
  ]),
  total: z.number(),
})
