import { getRepository } from '@/services/repository'
import { publishToAll } from '@/services/eventBus'
import type { Order, OrderStatus } from '@/shared/types'
import { POINTS_PER_ORDER } from './types'

export function nextStatus(current: OrderStatus): OrderStatus | null {
  const map: Record<OrderStatus, OrderStatus | null> = {
    pending: 'paid',
    paid: 'preparing',
    preparing: 'delivering',
    delivering: 'delivered',
    delivered: null,
    cancelled: null,
  }
  return map[current]
}

/**
 * Advances the order by one lifecycle step, updating the repository and
 * publishing events to the caregiver's SSE stream. If the order reaches
 * `delivered`, automatically credits points to the caregiver.
 *
 * Returns the updated order (or null if the order is missing / terminal).
 */
export function advanceOrder(orderId: string): Order | null {
  const repo = getRepository()
  const order = repo.getOrderById(orderId)
  if (!order) return null
  const next = nextStatus(order.status)
  if (!next) return order
  const updated = repo.updateOrder(orderId, { status: next })
  if (!updated) return null
  publishToAll([updated.caregiverId], {
    kind: 'order',
    orderId: updated.id,
    status: next,
  })
  if (next === 'delivered') {
    const entry = repo.appendPoint(
      updated.caregiverId,
      POINTS_PER_ORDER,
      `Order ${updated.id}`,
    )
    publishToAll([updated.caregiverId], {
      kind: 'point',
      caregiverId: updated.caregiverId,
      delta: entry.delta,
      balance: entry.balanceAfter,
    })
  }
  return updated
}

export function scheduleFullLifecycle(orderId: string, stepMs: number): void {
  const advance = () => {
    const updated = advanceOrder(orderId)
    if (updated && updated.status !== 'delivered' && updated.status !== 'cancelled') {
      setTimeout(advance, stepMs)
    }
  }
  setTimeout(advance, stepMs)
}
