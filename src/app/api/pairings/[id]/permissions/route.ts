import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { permissionsBodySchema } from '@/services/adapter/schemas/invite'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const repo = getRepository()
  const target = repo.getPairing(id)
  if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const requester = repo.getPairingByPair(target.elderId, auth.userId)
  if (!requester?.isPrimary)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  // Cannot toggle the primary caregiver's own record via this endpoint
  if (target.isPrimary)
    return NextResponse.json(
      { error: 'FORBIDDEN', errorCode: 'CANNOT_EDIT_PRIMARY' },
      { status: 403 },
    )

  let body: z.infer<typeof permissionsBodySchema>
  try {
    body = permissionsBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const updated = repo.updatePairing(id, { permissions: body.permissions })
  return NextResponse.json({
    id: updated?.id,
    permissions: updated?.permissions,
  })
}
