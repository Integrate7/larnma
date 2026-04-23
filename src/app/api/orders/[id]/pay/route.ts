import { NextResponse, type NextRequest } from 'next/server'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { advanceOrder } from '@/services/orderLifecycle'

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
  const order = repo.getOrderById(id)
  if (!order) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (order.caregiverId !== auth.userId)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  if (order.status !== 'pending')
    return NextResponse.json(
      { error: 'ALREADY_PAID', status: order.status },
      { status: 409 },
    )
  const paid = advanceOrder(id)
  return NextResponse.json({ id: paid?.id, status: paid?.status })
}
