import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createOrderBodySchema } from '@/services/adapter/schemas/order'
import {
  checkOriginAllowed,
  checkPermission,
  requireCaregiver,
} from '@/services/guards'
import { getRepository } from '@/services/repository'
import { scheduleFullLifecycle } from '@/services/orderLifecycle'
import { ADAPTER_CONFIG } from '@/services/adapter/config'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: z.infer<typeof createOrderBodySchema>
  try {
    body = createOrderBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  if (
    !checkPermission({
      caregiverId: auth.userId,
      elderId: body.elderId,
      required: 'pay_food_orders',
    })
  ) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const total = body.menu.reduce((sum, i) => sum + i.price * i.qty, 0)
  const repo = getRepository()
  const order = repo.createOrder({
    eventId: body.eventId,
    caregiverId: auth.userId,
    elderId: body.elderId,
    menu: body.menu,
    total,
    status: 'pending',
    mockRef: `MOCK-${Date.now()}`,
  })

  // auto-advance through full lifecycle (pending→paid→preparing→delivering→delivered)
  scheduleFullLifecycle(order.id, ADAPTER_CONFIG.orderLifecycleStepMs)

  return NextResponse.json({ id: order.id, status: order.status, total })
}
