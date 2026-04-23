import QRCode from 'qrcode'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createPairingQrBodySchema } from '@/services/adapter/schemas/pairing'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { signJwt } from '@/services/jwt'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: z.infer<typeof createPairingQrBodySchema>
  try {
    body = createPairingQrBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const repo = getRepository()
  const pairing = repo.getPairingByPair(body.elderId, auth.userId)
  if (!pairing?.isPrimary) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const signed = await signJwt(
    {
      sub: auth.userId,
      kind: 'pairing',
      elderId: body.elderId,
      caregiverId: auth.userId,
    },
    ADAPTER_CONFIG.pairingQrTtlSec,
  )
  const qrDataUrl = await QRCode.toDataURL(signed.token, { width: 512, margin: 4 })
  return NextResponse.json({
    qrDataUrl,
    token: signed.token,
    exp: new Date(signed.exp * 1000).toISOString(),
  })
}
