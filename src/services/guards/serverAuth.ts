import { cookies } from 'next/headers'
import { COOKIES, verifyJwt } from '@/services/jwt'

export type ServerAuth =
  | { role: 'caregiver'; userId: string }
  | { role: 'elder'; elderId: string }

export async function getServerAuth(): Promise<ServerAuth | null> {
  const store = await cookies()

  const access = store.get(COOKIES.access)?.value
  if (access) {
    const v = await verifyJwt<{ sub: string; role: string; kind: string }>(
      access,
    )
    if (v.valid && v.payload.role === 'caregiver' && v.payload.kind === 'access') {
      return { role: 'caregiver', userId: v.payload.sub }
    }
  }

  const device = store.get(COOKIES.device)?.value
  if (device) {
    const v = await verifyJwt<{
      sub: string
      role: string
      kind: string
      elderId: string
    }>(device)
    if (v.valid && v.payload.role === 'elder' && v.payload.kind === 'device') {
      return { role: 'elder', elderId: v.payload.elderId }
    }
  }

  return null
}
