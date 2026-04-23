import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { acceptInviteBodySchema } from '@/services/adapter/schemas/invite'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES, setSessionCookie, verifyJwt } from '@/services/jwt'
import { checkOriginAllowed } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { DEFAULT_SECONDARY_PERMISSIONS } from '@/shared/types'
import { verifyOtp } from '@/services/otp'

export const runtime = 'nodejs'

async function sha256Hex(text: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const { token } = await params
  let body: z.infer<typeof acceptInviteBodySchema>
  try {
    body = acceptInviteBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const v = await verifyJwt<{ kind: string; elderId: string; inviterId: string }>(
    token,
  )
  if (!v.valid || v.payload.kind !== 'invite')
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })

  const repo = getRepository()
  const hash = await sha256Hex(token)
  const invite = repo.getInviteByTokenHash(hash)
  if (!invite) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (invite.acceptedByCaregiverId)
    return NextResponse.json({ error: 'CONSUMED' }, { status: 409 })
  if (new Date(invite.expiresAt) < new Date())
    return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })

  const otpResult = await verifyOtp({
    phone: body.phone,
    code: body.code,
    ref: body.ref,
  })
  if (!otpResult.success) {
    return NextResponse.json(
      { error: otpResult.error, errorCode: otpResult.error },
      { status: 401 },
    )
  }

  const existing = repo.getUserByPhone(body.phone)
  const user =
    existing ??
    repo.createUser({
      role: 'caregiver',
      phone: body.phone,
      name: body.name,
    })
  if (existing) repo.updateUser(user.id, { name: body.name })

  const pairing =
    repo.getPairingByPair(invite.elderId, user.id) ??
    repo.createPairing({
      elderId: invite.elderId,
      caregiverId: user.id,
      isPrimary: false,
      permissions: DEFAULT_SECONDARY_PERMISSIONS,
    })
  repo.updateInvite(invite.id, {
    acceptedByCaregiverId: user.id,
    acceptedAt: new Date().toISOString(),
  })

  const session = await issueCaregiverSession({ userId: user.id })
  const res = NextResponse.json({
    pairingId: pairing.id,
    caregiverId: user.id,
  })
  setSessionCookie(res, COOKIES.access, session.accessToken, {
    maxAgeSec: ADAPTER_CONFIG.accessTtlSec,
  })
  setSessionCookie(res, COOKIES.refresh, session.refreshToken, {
    maxAgeSec: ADAPTER_CONFIG.refreshTtlSec,
  })
  return res
}
