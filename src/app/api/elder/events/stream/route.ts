import type { NextRequest } from 'next/server'
import { requireDevice } from '@/services/guards'
import { subscribeElder, type ElderEvent } from '@/services/eventBus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 15_000

export async function GET(req: NextRequest) {
  const auth = await requireDevice(req)
  if (!auth.ok) return new Response('Unauthorized', { status: 401 })
  if (auth.role !== 'elder') return new Response('Forbidden', { status: 403 })

  const elderId = auth.elderId
  const enc = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ElderEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`
        try {
          controller.enqueue(enc.encode(payload))
        } catch {
          // controller closed
        }
      }
      send({ kind: 'heartbeat' })
      unsubscribe = subscribeElder(elderId, send)
      heartbeat = setInterval(() => send({ kind: 'heartbeat' }), HEARTBEAT_MS)
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
