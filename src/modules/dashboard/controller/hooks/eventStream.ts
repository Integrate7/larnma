import { useEffect } from 'react'
import type { useDashboardGlobalState } from './globalState'

type GS = ReturnType<typeof useDashboardGlobalState>

/**
 * Connects to the /api/events/stream SSE endpoint and pushes new events into
 * the dashboard global state as they arrive. Auto-reconnects on close.
 */
export function useDashboardEventStream(gs: GS) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor = (window as unknown as { EventSource?: typeof EventSource })
      .EventSource
    if (!Ctor) {
      gs.setConnecting(false)
      return
    }
    const es = new Ctor('/api/events/stream', { withCredentials: true })
    gs.setConnecting(true)
    es.onopen = () => gs.setConnecting(false)
    es.onerror = () => gs.setError('ขาดการเชื่อมต่อ')
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse((msg as MessageEvent).data) as {
          kind: string
          event?: unknown
          notification?: unknown
          orderId?: string
          status?: string
        }
        if (parsed.kind === 'audio' && parsed.event) {
          gs.prependEvent(parsed.event as never)
        } else if (parsed.kind === 'notification' && parsed.notification) {
          gs.prependNotification(parsed.notification as never)
        } else if (parsed.kind === 'order' && parsed.orderId && parsed.status) {
          gs.updateOrderStatus(parsed.orderId, parsed.status)
        }
      } catch {
        // ignore bad frames
      }
    }
    return () => {
      es.close()
    }
  }, [gs])
}
