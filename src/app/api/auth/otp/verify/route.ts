import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyOtpBodySchema } from '@/services/adapter/schemas/auth'
import { verifyOtp } from '@/services/otp'
import { issueCaregiverSession } from '@/services/auth'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { COOKIES, setSessionCookie } from '@/services/jwt'
import { checkOriginAllowed } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req)) {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  }

  let body: z.infer<typeof verifyOtpBodySchema>
  try {
    body = verifyOtpBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', errorCode: 'VALIDATION' },
      { status: 400 },
    )
  }

  const v = await verifyOtp(body)
  if (!v.success) {
    const status =
      v.error === 'LOCKED' ? 429 : v.error === 'EXPIRED' ? 410 : 401
    return NextResponse.json({ error: v.error, errorCode: v.error }, { status })
  }

  const repo = getRepository()
  const existing = repo.getUserByPhone(v.phone)
  const user =
    existing ??
    repo.createUser({
      role: 'caregiver',
      phone: v.phone,
      name: '',
    })

  const session = await issueCaregiverSession({
    userId: user.id,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  const res = NextResponse.json({ userId: user.id, role: user.role })
  setSessionCookie(res, COOKIES.access, session.accessToken, {
    maxAgeSec: ADAPTER_CONFIG.accessTtlSec,
  })
  setSessionCookie(res, COOKIES.refresh, session.refreshToken, {
    maxAgeSec: ADAPTER_CONFIG.refreshTtlSec,
    path: '/',
  })
  return res
}
