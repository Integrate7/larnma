import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createInviteBodySchema } from '@/services/adapter/schemas/invite'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { signJwt } from '@/services/jwt'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

async function sha256Hex(text: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: z.infer<typeof createInviteBodySchema>
  try {
    body = createInviteBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const repo = getRepository()
  const pairing = repo.getPairingByPair(body.elderId, auth.userId)
  if (!pairing?.isPrimary)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const signed = await signJwt(
    {
      sub: auth.userId,
      kind: 'invite',
      elderId: body.elderId,
      inviterId: auth.userId,
    },
    ADAPTER_CONFIG.inviteTtlSec,
  )
  const tokenHash = await sha256Hex(signed.token)
  const invite = repo.createInvite({
    elderId: body.elderId,
    createdByCaregiverId: auth.userId,
    tokenHash,
    expiresAt: new Date(signed.exp * 1000).toISOString(),
  })
  return NextResponse.json({
    id: invite.id,
    token: signed.token,
    url: `/invite/${signed.token}`,
    exp: invite.expiresAt,
  })
}
