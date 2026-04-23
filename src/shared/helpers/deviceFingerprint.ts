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
  if (globalThis.window === undefined) return 'ssr-fp'
  try {
    const existing = globalThis.window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const entropy = crypto.getRandomValues(new Uint32Array(1))[0]
    const raw = `${navigator.userAgent}|${navigator.language}|${globalThis.window.screen.width}x${globalThis.window.screen.height}|${Date.now()}|${entropy}`
    // Synchronous-friendly: use a simple stable hash derived from raw.
    let h = 0
    for (let i = 0; i < raw.length; i += 1) {
      h = Math.trunc((h << 5) - h + (raw.codePointAt(i) ?? 0))
    }
    const fp = `fp-${h.toString(16)}-${Date.now().toString(36)}`
    globalThis.window.localStorage.setItem(STORAGE_KEY, fp)
    return fp
  } catch {
    return `fp-${Date.now().toString(36)}`
  }
}

export async function deviceFingerprintHash(): Promise<string> {
  return sha256Hex(deviceFingerprint())
}
