import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { sendOtpBodySchema } from '@/services/adapter/schemas/auth'
import { sendOtp } from '@/services/otp'
import { checkOriginAllowed } from '@/services/guards'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req)) {
    return NextResponse.json(
      { error: 'FORBIDDEN_ORIGIN' },
      { status: 403 },
    )
  }

  let body: z.infer<typeof sendOtpBodySchema>
  try {
    body = sendOtpBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', errorCode: 'VALIDATION' },
      { status: 400 },
    )
  }

  const r = await sendOtp(body.phone)
  if (!r.success) {
    return NextResponse.json(
      { error: r.error, errorCode: r.error },
      { status: 429 },
    )
  }
  return NextResponse.json({ ref: r.ref, expiresAt: r.expiresAt })
}
