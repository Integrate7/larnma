import { SignJWT, jwtVerify } from 'jose'
import { ADAPTER_CONFIG } from '@/services/adapter/config'

const enc = new TextEncoder()

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'dev-secret-larnma-change-me-00000000'
  return enc.encode(secret)
}

export async function signJwt(
  payload: Record<string, unknown>,
  ttlSec: number,
): Promise<{ token: string; jti: string; exp: number }> {
  const jti = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + ttlSec
  const token = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(ADAPTER_CONFIG.jwtIssuer)
    .setExpirationTime(exp)
    .setSubject(String(payload.sub ?? jti))
    .sign(getSecret())
  return { token, jti, exp }
}

export async function verifyJwt<T = Record<string, unknown>>(
  token: string,
): Promise<{ valid: true; payload: T } | { valid: false; error: string }> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ADAPTER_CONFIG.jwtIssuer,
    })
    return { valid: true, payload: payload as unknown as T }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) }
  }
}
