import { NextResponse, type NextRequest } from 'next/server'
import { verifyJwt } from '@/services/jwt'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

async function sha256Hex(text: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const v = await verifyJwt<{ kind: string; elderId: string; inviterId: string }>(
    token,
  )
  if (!v.valid || v.payload.kind !== 'invite')
    return NextResponse.json({ error: 'INVALID' }, { status: 401 })

  const repo = getRepository()
  const hash = await sha256Hex(token)
  const invite = repo.getInviteByTokenHash(hash)
  if (!invite) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (invite.acceptedByCaregiverId)
    return NextResponse.json({ error: 'CONSUMED' }, { status: 409 })
  if (new Date(invite.expiresAt) < new Date())
    return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })

  const elder = repo.getUserById(invite.elderId)
  const inviter = repo.getUserById(invite.createdByCaregiverId)
  return NextResponse.json({
    elderId: invite.elderId,
    elderName: elder?.name,
    inviterName: inviter?.name,
    exp: invite.expiresAt,
  })
}
