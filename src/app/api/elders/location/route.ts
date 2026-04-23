import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'
import type { ElderLocation } from '@/shared/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const repo = getRepository()
  const pairings = repo.listPairingsByCaregiver(auth.userId)
  const locations = pairings
    .map((p) => repo.getElderLocation(p.elderId))
    .filter((l): l is ElderLocation => l !== undefined)

  return NextResponse.json({ locations })
}
