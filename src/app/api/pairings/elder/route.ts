import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  const elderId = req.nextUrl.searchParams.get('elderId')
  if (!elderId) return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 })

  const repo = getRepository()
  const callerPairing = repo.getPairingByPair(elderId, auth.userId)
  if (!callerPairing) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const pairings = repo.listPairingsByElder(elderId)
  const caregivers = pairings
    .map((p) => {
      const user = repo.getUserById(p.caregiverId)
      if (!user) return null
      return {
        pairingId: p.id,
        name: user.name,
        phone: user.phone,
        isPrimary: p.isPrimary,
        isCurrentUser: p.caregiverId === auth.userId,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return NextResponse.json({ caregivers })
}
