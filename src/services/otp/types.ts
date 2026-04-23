export type SendOtpResult =
  | { success: true; ref: string; expiresAt: string }
  | { success: false; error: 'LOCKED' | 'RATE_LIMITED' }

export type VerifyOtpResult =
  | { success: true; phone: string }
  | {
      success: false
      error: 'EXPIRED' | 'LOCKED' | 'INVALID' | 'NOT_FOUND' | 'CONSUMED'
    }
