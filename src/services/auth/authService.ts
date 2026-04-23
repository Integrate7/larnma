import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { signJwt, verifyJwt } from '@/services/jwt'
import { getRepository } from '@/services/repository'

export type IssuedSession = {
  accessToken: string
  refreshToken: string
  userId: string
  sessionId: string
}

async function sha256Hex(text: string): Promise<string> {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

export async function issueCaregiverSession(opts: {
  userId: string
  userAgent?: string
  ip?: string
}): Promise<IssuedSession> {
  const repo = getRepository()

  const refreshSigned = await signJwt(
    { sub: opts.userId, kind: 'refresh', role: 'caregiver' },
    ADAPTER_CONFIG.refreshTtlSec,
  )
  const refreshHash = await sha256Hex(refreshSigned.token)
  const session = repo.createSession({
    userId: opts.userId,
    refreshHash,
    userAgent: opts.userAgent,
    ip: opts.ip,
  })

  const accessSigned = await signJwt(
    {
      sub: opts.userId,
      kind: 'access',
      role: 'caregiver',
      sid: session.id,
    },
    ADAPTER_CONFIG.accessTtlSec,
  )

  return {
    accessToken: accessSigned.token,
    refreshToken: refreshSigned.token,
    userId: opts.userId,
    sessionId: session.id,
  }
}

export async function rotateCaregiverSession(
  refreshToken: string,
): Promise<IssuedSession | null> {
  const v = await verifyJwt<{ sub: string; role: string; kind: string }>(
    refreshToken,
  )
  if (!v.valid) return null
  if (v.payload.kind !== 'refresh' || v.payload.role !== 'caregiver') return null
  return issueCaregiverSession({ userId: v.payload.sub })
}

export async function issueDeviceSession(opts: {
  elderId: string
  fingerprint: string
}): Promise<{ token: string; sessionId: string }> {
  const repo = getRepository()
  const signed = await signJwt(
    {
      sub: opts.elderId,
      kind: 'device',
      role: 'elder',
      elderId: opts.elderId,
      fingerprint: opts.fingerprint,
    },
    ADAPTER_CONFIG.deviceTtlSec,
  )
  const refreshHash = await sha256Hex(signed.token)
  const ds = repo.createDeviceSession({
    elderId: opts.elderId,
    deviceFingerprint: opts.fingerprint,
    refreshHash,
  })
  return { token: signed.token, sessionId: ds.id }
}
