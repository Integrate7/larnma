import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { id } = await params
  const repo = getRepository()
  const pairing = repo.getPairing(id)
  if (!pairing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const callerPairing = repo.getPairingByPair(pairing.elderId, auth.userId)
  if (!callerPairing?.isPrimary)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  if (pairing.caregiverId === auth.userId)
    return NextResponse.json({ error: 'CANNOT_REVOKE_SELF' }, { status: 400 })

  repo.updatePairing(id, { revokedAt: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
