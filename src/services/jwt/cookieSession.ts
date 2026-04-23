import type { NextRequest, NextResponse } from 'next/server'
import { ADAPTER_CONFIG } from '@/services/adapter/config'

export type CookieOpts = {
  maxAgeSec?: number
  path?: string
}

export function setSessionCookie(
  res: NextResponse,
  name: string,
  value: string,
  opts: CookieOpts = {},
) {
  res.cookies.set({
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: opts.path ?? '/',
    maxAge: opts.maxAgeSec,
  })
}

export function clearSessionCookie(
  res: NextResponse,
  name: string,
  path = '/',
) {
  res.cookies.set({
    name,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path,
    maxAge: 0,
  })
}

export function readCookie(req: NextRequest, name: string): string | undefined {
  return req.cookies.get(name)?.value
}

export const COOKIES = {
  access: ADAPTER_CONFIG.accessCookie,
  refresh: ADAPTER_CONFIG.refreshCookie,
  device: ADAPTER_CONFIG.deviceCookie,
}
