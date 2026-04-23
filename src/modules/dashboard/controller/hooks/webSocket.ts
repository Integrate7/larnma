import { useEffect, useRef } from 'react'
import type { useDashboardGlobalState } from './globalState'

type GS = ReturnType<typeof useDashboardGlobalState>

export function useDashboardWebSocket(gs: GS) {
  const gsRef = useRef(gs)
  gsRef.current = gs

  useEffect(() => {
    if (typeof window === 'undefined') return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/events/ws`)
    gsRef.current.setConnecting(true)

    ws.onopen = () => gsRef.current.setConnecting(false)
    ws.onerror = () => gsRef.current.setError('ขาดการเชื่อมต่อ')
    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data as string) as {
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

    return () => ws.close()
  }, []) // empty deps — runs once, no infinite loop
}
