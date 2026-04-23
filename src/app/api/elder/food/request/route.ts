import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDevice } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { fanOutEvent } from '@/services/notifications'
import { publishTo } from '@/services/eventBus'
import { MENU_CATALOG } from '@/services/menu'

export const runtime = 'nodejs'

const bodySchema = z.object({ menuId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const auth = await requireDevice(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'elder')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const menuItem = MENU_CATALOG.find((m) => m.id === body.menuId)
  if (!menuItem)
    return NextResponse.json({ error: 'MENU_NOT_FOUND' }, { status: 404 })

  const repo = getRepository()
  const event = repo.createAudioEvent({
    elderId: auth.elderId,
    transcript: `หิวข้าว อยากกิน${menuItem.name}`,
    mood: 'HUNGRY',
    intent: 'HUNGRY',
    confidence: 1,
    summary: `ผู้สูงอายุกดสั่ง ${menuItem.name}`,
    entities: { food: menuItem.name, menuId: menuItem.id, price: menuItem.price },
  })

  const notis = fanOutEvent(event)
  const caregiverIds = Array.from(
    new Set(repo.listPairingsByElder(auth.elderId).map((p) => p.caregiverId)),
  )
  for (const cid of caregiverIds) {
    publishTo(cid, { kind: 'audio', event })
  }
  for (const n of notis) {
    publishTo(n.caregiverId, { kind: 'notification', notification: n })
  }

  return NextResponse.json({ eventId: event.id })
}
