import { useEffect } from 'react'
import type { useElderHomeGlobalState } from './globalState'

type GS = ReturnType<typeof useElderHomeGlobalState>

export function useElderEventStream(gs: GS) {
  useEffect(() => {
    if (globalThis.window === undefined) return
    const Ctor = (globalThis.window as unknown as { EventSource?: typeof EventSource }).EventSource
    if (!Ctor) return

    const es = new Ctor('/api/elder/events/stream', { withCredentials: true })
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as {
          kind: string
          menuName?: string
          caregiverName?: string
        }
        if (parsed.kind === 'order_delivered' && parsed.menuName) {
          gs.setOrderNotification({
            menuName: parsed.menuName,
            caregiverName: parsed.caregiverName ?? 'หลาน',
          })
        }
      } catch {
        // ignore bad frames
      }
    }
    return () => es.close()
  }, [gs.setOrderNotification])
}
