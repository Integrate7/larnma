import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { getRepository } from '@/services/repository'
import type { SendOtpResult, VerifyOtpResult } from './types'

// Hackathon: mock OTP code is '123456' — its SHA-256 is embedded as the codeHash
// so the rest of the code treats it like a real hashed value. Ready to swap
// to randomly-generated codes by replacing `codeFor()`.
export const MOCK_OTP_CODE = '123456'

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text),
    )
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Node fallback
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

const codeFor = (_phone: string) => MOCK_OTP_CODE

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const repo = getRepository()
  const latest = repo.latestOtpChallengeByPhone(phone)
  if (latest?.lockedUntil && new Date(latest.lockedUntil) > new Date()) {
    return { success: false, error: 'LOCKED' }
  }

  const attempts = repo.otpAttemptsInWindow(phone, 10 * 60 * 1000)
  if (attempts >= ADAPTER_CONFIG.otpMaxAttempts) {
    repo.updateOtpChallenge(latest?.id ?? 'none', {
      lockedUntil: new Date(
        Date.now() + ADAPTER_CONFIG.otpLockSec * 1000,
      ).toISOString(),
    })
    return { success: false, error: 'RATE_LIMITED' }
  }

  const ref = crypto.randomUUID()
  const code = codeFor(phone)
  const codeHash = await sha256Hex(code)
  const expiresAt = new Date(
    Date.now() + ADAPTER_CONFIG.otpExpireSec * 1000,
  ).toISOString()
  repo.createOtpChallenge({
    phone,
    codeHash,
    ref,
    attempts: 0,
    expiresAt,
  })
  return { success: true, ref, expiresAt }
}

export async function verifyOtp(input: {
  phone: string
  code: string
  ref: string
}): Promise<VerifyOtpResult> {
  const repo = getRepository()
  const challenge = repo.getOtpChallengeByRef(input.ref)
  if (!challenge) return { success: false, error: 'NOT_FOUND' }
  if (challenge.phone !== input.phone) return { success: false, error: 'INVALID' }
  if (challenge.consumedAt) return { success: false, error: 'CONSUMED' }
  if (
    challenge.lockedUntil &&
    new Date(challenge.lockedUntil) > new Date()
  ) {
    return { success: false, error: 'LOCKED' }
  }
  if (new Date(challenge.expiresAt) < new Date()) {
    return { success: false, error: 'EXPIRED' }
  }

  const hash = await sha256Hex(input.code)
  if (hash !== challenge.codeHash) {
    const nextAttempts = challenge.attempts + 1
    const lock =
      nextAttempts >= ADAPTER_CONFIG.otpMaxAttempts
        ? new Date(
            Date.now() + ADAPTER_CONFIG.otpLockSec * 1000,
          ).toISOString()
        : undefined
    repo.updateOtpChallenge(challenge.id, {
      attempts: nextAttempts,
      lockedUntil: lock,
    })
    if (lock) return { success: false, error: 'LOCKED' }
    return { success: false, error: 'INVALID' }
  }

  repo.updateOtpChallenge(challenge.id, {
    consumedAt: new Date().toISOString(),
  })
  return { success: true, phone: challenge.phone }
}
