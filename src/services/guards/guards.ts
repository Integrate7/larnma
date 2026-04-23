import type { NextRequest } from 'next/server'
import { COOKIES, readCookie, verifyJwt } from '@/services/jwt'
import { getRepository } from '@/services/repository'
import type { PermissionKey } from '@/shared/types'
import type { AuthContext, PermissionGuardInput } from './types'

type CaregiverAuthSuccess = {
  ok: true
  role: 'caregiver'
  userId: string
  sessionId?: string
}

type ElderAuthSuccess = {
  ok: true
  role: 'elder'
  elderId: string
  sessionId: string
}

type AuthFailure = { ok: false; error: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function requireCaregiver(
  req: NextRequest,
): Promise<CaregiverAuthSuccess | AuthFailure> {
  const token = readCookie(req, COOKIES.access)
  if (!token) return { ok: false, error: 'UNAUTHENTICATED' }
  const v = await verifyJwt<{
    sub: string
    role: string
    kind: string
    sid?: string
  }>(token)
  if (!v.valid) return { ok: false, error: 'UNAUTHENTICATED' }
  if (v.payload.role !== 'caregiver' || v.payload.kind !== 'access') {
    return { ok: false, error: 'FORBIDDEN' }
  }
  return {
    ok: true,
    role: 'caregiver',
    userId: v.payload.sub,
    sessionId: v.payload.sid,
  }
}

export async function requireDevice(
  req: NextRequest,
): Promise<ElderAuthSuccess | AuthFailure> {
  const token = readCookie(req, COOKIES.device)
  if (!token) return { ok: false, error: 'UNAUTHENTICATED' }
  const v = await verifyJwt<{
    sub: string
    role: string
    kind: string
    elderId: string
  }>(token)
  if (!v.valid) return { ok: false, error: 'UNAUTHENTICATED' }
  if (v.payload.role !== 'elder' || v.payload.kind !== 'device') {
    return { ok: false, error: 'FORBIDDEN' }
  }
  return {
    ok: true,
    role: 'elder',
    elderId: v.payload.elderId,
    sessionId: v.payload.sub,
  }
}

export function checkPermission(input: PermissionGuardInput): boolean {
  const repo = getRepository()
  const pairing = repo.getPairingByPair(input.elderId, input.caregiverId)
  if (!pairing) return false
  return Boolean(pairing.permissions[input.required])
}

export function requirePrimary(caregiverId: string, elderId: string): boolean {
  const repo = getRepository()
  const pairing = repo.getPairingByPair(elderId, caregiverId)
  return Boolean(pairing?.isPrimary)
}

export async function requirePermission(
  req: NextRequest,
  elderId: string,
  permission: PermissionKey,
): Promise<
  | { ok: true; caregiverId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return { ok: false, status: 401, error: 'UNAUTHENTICATED' }
  const cg = auth as Extract<AuthContext, { role: 'caregiver' }>
  if (!checkPermission({ caregiverId: cg.userId, elderId, required: permission })) {
    return { ok: false, status: 403, error: 'FORBIDDEN' }
  }
  return { ok: true, caregiverId: cg.userId }
}

export function checkOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin) return true // same-origin navigations have no Origin
  try {
    const url = new URL(origin)
    return url.host === host
  } catch {
    return false
  }
}
