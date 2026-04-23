export const ADAPTER_CONFIG = {
  jwtIssuer: 'larnma',
  accessCookie: 'larnma_access',
  refreshCookie: 'larnma_refresh',
  deviceCookie: 'larnma_device',
  accessTtlSec: 15 * 60,
  refreshTtlSec: 30 * 24 * 60 * 60,
  deviceTtlSec: 365 * 24 * 60 * 60,
  otpExpireSec: 5 * 60,
  otpLockSec: 30 * 60,
  otpMaxAttempts: 3,
  pairingQrTtlSec: 15 * 60,
  inviteTtlSec: 24 * 60 * 60,
  escalationSec: 5 * 60,
  orderLifecycleStepMs: 10_000,
} as const

export type AdapterConfig = typeof ADAPTER_CONFIG
