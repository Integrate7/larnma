import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const pairings = getRepository().listPairingsByCaregiver(auth.userId)
  return NextResponse.json(
    pairings.map((p) => ({ id: p.id, elderId: p.elderId, isPrimary: p.isPrimary })),
  )
}
