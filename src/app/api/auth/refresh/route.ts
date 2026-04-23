import { NextResponse, type NextRequest } from 'next/server'
import { rotateCaregiverSession } from '@/services/auth'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import {
  COOKIES,
  clearSessionCookie,
  readCookie,
  setSessionCookie,
} from '@/services/jwt'
import { checkOriginAllowed } from '@/services/guards'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req)) {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  }
  const refresh = readCookie(req, COOKIES.refresh)
  if (!refresh) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const s = await rotateCaregiverSession(refresh)
  if (!s) {
    const res = NextResponse.json({ error: 'INVALID' }, { status: 401 })
    clearSessionCookie(res, COOKIES.access)
    clearSessionCookie(res, COOKIES.refresh)
    return res
  }
  const res = NextResponse.json({ userId: s.userId })
  setSessionCookie(res, COOKIES.access, s.accessToken, {
    maxAgeSec: ADAPTER_CONFIG.accessTtlSec,
  })
  setSessionCookie(res, COOKIES.refresh, s.refreshToken, {
    maxAgeSec: ADAPTER_CONFIG.refreshTtlSec,
  })
  return res
}
