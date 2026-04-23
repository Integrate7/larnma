import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
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
      z.object({ locked: z.boolean(), lockedByCaregiverId: z.string().optional() }),
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
  return { ack, reload: args.reload }
}
