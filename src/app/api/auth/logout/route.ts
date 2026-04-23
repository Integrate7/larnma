import { NextResponse, type NextRequest } from 'next/server'
import { COOKIES, clearSessionCookie } from '@/services/jwt'
import { checkOriginAllowed } from '@/services/guards'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req)) {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res, COOKIES.access)
  clearSessionCookie(res, COOKIES.refresh)
  return res
}
