import type { NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { subscribe, type DashboardEvent } from '@/services/eventBus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 15_000

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (auth.role !== 'caregiver') {
    return new Response('Forbidden', { status: 403 })
  }
  const caregiverId = auth.userId

  const enc = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: DashboardEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`
        try {
          controller.enqueue(enc.encode(payload))
        } catch {
          // controller closed
        }
      }
      // Initial hello
      send({ kind: 'heartbeat' })
      unsubscribe = subscribe(caregiverId, send)
      heartbeat = setInterval(
        () => send({ kind: 'heartbeat' }),
        HEARTBEAT_MS,
      )
    },
    cancel() {
      unsubscribe?.()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
