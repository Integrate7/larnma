import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { updateCaregiverBodySchema } from '@/services/adapter/schemas/caregiver'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const user = getRepository().getUserById(auth.userId)
  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    profilePicUrl: user.profilePicUrl,
  })
}

export async function PATCH(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let body: z.infer<typeof updateCaregiverBodySchema>
  try {
    body = updateCaregiverBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const repo = getRepository()
  const user = repo.updateUser(auth.userId, {
    name: body.name,
    profilePicUrl: body.profilePicUrl,
  })
  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
  })
}
