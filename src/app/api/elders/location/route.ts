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

  if (process.env.NODE_ENV === 'development' && locations.length === 0) {
    const mockLocations = pairings.map((p) => ({
      elderId: p.elderId,
      lat: 13.7563,
      lng: 100.5018,
      accuracy: 10,
      capturedAt: new Date().toISOString(),
    }))
    return NextResponse.json({ locations: mockLocations })
  }

  return NextResponse.json({ locations })
}
