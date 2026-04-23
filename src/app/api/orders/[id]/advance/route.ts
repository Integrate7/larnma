import { NextResponse, type NextRequest } from 'next/server'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { advanceOrder } from '@/services/orderLifecycle'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

/**
 * Advances an order by one lifecycle step. In the real app this would be
 * triggered by a cron or delivery partner webhook; exposing it as an endpoint
 * lets the demo + E2E drive the lifecycle deterministically.
 */
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
  const order = repo.getOrderById(id)
  if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (order.caregiverId !== auth.userId)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const next = advanceOrder(id)
  return NextResponse.json({ id: next?.id, status: next?.status })
}
