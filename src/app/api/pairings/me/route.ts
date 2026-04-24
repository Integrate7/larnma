import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  const repo = getRepository()
  const pairings = repo.listPairingsByCaregiver(auth.userId)

  const body = pairings.map((p) => {
    const elder = repo.getUserById(p.elderId)
    const elderName = elder?.name ?? null
    const elderPhone = elder?.phone && elder.phone.length > 0 ? elder.phone : null
    return {
      id: p.id,
      elderId: p.elderId,
      isPrimary: p.isPrimary,
      elderName,
      elderPhone,
    }
  })

  return NextResponse.json(body)
}
