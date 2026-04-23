import type { PermissionKey } from '@/shared/types'

export type AuthContext =
  | {
      ok: true
      role: 'caregiver'
      userId: string
      sessionId?: string
    }
  | {
      ok: true
      role: 'elder'
      elderId: string
      sessionId: string
    }
  | {
      ok: false
      error: 'UNAUTHENTICATED' | 'FORBIDDEN'
    }

export type PermissionGuardInput = {
  caregiverId: string
  elderId: string
  required: PermissionKey
}
