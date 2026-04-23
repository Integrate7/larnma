import { useEffect, useRef } from 'react'
import type { useDashboardGlobalState } from './globalState'

type GS = ReturnType<typeof useDashboardGlobalState>

/**
 * Connects to the /api/events/stream SSE endpoint and pushes new events into
 * the dashboard global state as they arrive. Auto-reconnects on close.
 */
export function useDashboardEventStream(gs: GS) {
  // Keep a mutable reference to the latest gs so the effect body always sees
  // fresh setters without re-triggering the effect. `gs` is a fresh object
  // literal every render — using it in deps would teardown + reconnect on
  // every state update, producing an infinite reconnect loop.
  const gsRef = useRef(gs)
  gsRef.current = gs

  useEffect(() => {
    if (globalThis.window === undefined) return
    const Ctor = (globalThis.window as unknown as { EventSource?: typeof EventSource })
      .EventSource
    if (!Ctor) {
      gsRef.current.setConnecting(false)
      return
    }
    const es = new Ctor('/api/events/stream', { withCredentials: true })
    gsRef.current.setConnecting(true)
    es.onopen = () => gsRef.current.setConnecting(false)
    es.onerror = () => gsRef.current.setError('ขาดการเชื่อมต่อ')
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as {
          kind: string
          event?: unknown
          notification?: unknown
          orderId?: string
          status?: string
        }
        if (parsed.kind === 'audio' && parsed.event) {
          gsRef.current.prependEvent(parsed.event as never)
        } else if (parsed.kind === 'notification' && parsed.notification) {
          gsRef.current.prependNotification(parsed.notification as never)
        } else if (parsed.kind === 'order' && parsed.orderId && parsed.status) {
          gsRef.current.updateOrderStatus(parsed.orderId, parsed.status)
        }
      } catch {
        // ignore bad frames
      }
    }
    return () => {
      es.close()
    }
  }, [])
}
