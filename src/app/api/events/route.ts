import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const repo = getRepository()
  const pairings = repo.listPairingsByCaregiver(auth.userId)
  const events = pairings
    .flatMap((p) => repo.listAudioEventsByElder(p.elderId, 20))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50)
  const notifications = repo.listNotificationsByCaregiver(auth.userId, 50)
  return NextResponse.json({ events, notifications })
}
