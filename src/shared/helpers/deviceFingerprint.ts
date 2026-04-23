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
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(text).digest('hex')
}

const STORAGE_KEY = 'larnma.device.fp.v1'

export function deviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr-fp'
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const raw = `${navigator.userAgent}|${navigator.language}|${window.screen.width}x${window.screen.height}|${Date.now()}|${Math.random()}`
    // Synchronous-friendly: use a simple stable hash derived from raw.
    let h = 0
    for (let i = 0; i < raw.length; i += 1) {
      h = ((h << 5) - h + raw.charCodeAt(i)) | 0
    }
    const fp = `fp-${h.toString(16)}-${Date.now().toString(36)}`
    window.localStorage.setItem(STORAGE_KEY, fp)
    return fp
  } catch {
    return `fp-${Date.now().toString(36)}`
  }
}

export async function deviceFingerprintHash(): Promise<string> {
  return sha256Hex(deviceFingerprint())
}
