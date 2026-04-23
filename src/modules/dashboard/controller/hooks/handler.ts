import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { AudioEvent, Notification } from '@/shared/types'
import type { DashboardHandler } from '../../types'
import type { useDashboardGlobalState } from './globalState'

type GS = ReturnType<typeof useDashboardGlobalState>

export function useDashboardHandler(args: {
  gs: GS
  reload: () => Promise<void>
}): DashboardHandler {
  const ack = async (notificationId: string) => {
    const res = await fetcher(
      `/api/notifications/${notificationId}/ack`,
      z.object({
        locked: z.boolean(),
        lockedByCaregiverId: z.string().optional(),
      }),
      { method: 'POST', body: {} },
    )
    if (res.success) {
      args.gs.updateNotification(notificationId, {
        ackAt: new Date().toISOString(),
        lockedByCaregiverId: res.data.lockedByCaregiverId,
      })
    } else {
      args.gs.setError(res.error)
    }
  }

  const order = async (notification: Notification, events: AudioEvent[], menuId: string) => {
    const event = events.find((e) => e.id === notification.eventId)
    if (!event) return

    const suggestions = (event.entities as { menuSuggestions?: { id: string; name: string; price: number }[] }).menuSuggestions ?? []
    const chosen = suggestions.find((m) => m.id === menuId)
    if (!chosen) return

    const res = await fetcher(
      '/api/orders',
      z.object({ id: z.string(), status: z.string(), total: z.number() }),
      {
        method: 'POST',
        body: {
          elderId: event.elderId,
          eventId: event.id,
          menu: [{ name: chosen.name, price: chosen.price, qty: 1 }],
        },
      },
    )
    if (res.success) {
      args.gs.addOrderedEventId(event.id)
      args.gs.updateOrderStatus(res.data.id, res.data.status)
    } else {
      args.gs.setError(res.error)
    }
  }

  return { ack, order, reload: args.reload }
}
