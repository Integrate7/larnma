import type { OrderStatus } from '@/shared/types'

export const ORDER_LIFECYCLE: OrderStatus[] = [
  'paid',
  'preparing',
  'delivering',
  'delivered',
]

export const POINTS_PER_ORDER = 50
