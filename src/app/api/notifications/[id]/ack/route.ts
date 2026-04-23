import { NextResponse, type NextRequest } from 'next/server'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { publishToAll } from '@/services/eventBus'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { id } = await params
  const repo = getRepository()
  const noti = repo.getNotificationById(id)
  if (!noti) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (noti.caregiverId !== auth.userId)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const result = repo.lockNotification(id, auth.userId)

  // Publish ack to everyone paired with the elder (so other caregivers update UI)
  // NB: we broadcast by notification's caregiver for simplicity
  if (result.locked) {
    publishToAll([auth.userId], {
      kind: 'ack',
      notificationId: id,
      caregiverId: auth.userId,
    })
  }

  return NextResponse.json({
    locked: result.locked,
    lockedByCaregiverId:
      result.notification?.lockedByCaregiverId ?? (result.locked ? auth.userId : undefined),
  })
}
