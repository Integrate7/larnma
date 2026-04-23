import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { consumePairingBodySchema } from '@/services/adapter/schemas/pairing'
import { verifyJwt, COOKIES, setSessionCookie } from '@/services/jwt'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { issueDeviceSession } from '@/services/auth'
import { checkOriginAllowed } from '@/services/guards'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  let body: z.infer<typeof consumePairingBodySchema>
  try {
    body = consumePairingBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const v = await verifyJwt<{
    kind: string
    elderId: string
    caregiverId: string
  }>(body.token)
  if (!v.valid || v.payload.kind !== 'pairing') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  }

  const device = await issueDeviceSession({
    elderId: v.payload.elderId,
    fingerprint: body.deviceFingerprint,
  })

  const res = NextResponse.json({ elderId: v.payload.elderId })
  setSessionCookie(res, COOKIES.device, device.token, {
    maxAgeSec: ADAPTER_CONFIG.deviceTtlSec,
  })
  return res
}
