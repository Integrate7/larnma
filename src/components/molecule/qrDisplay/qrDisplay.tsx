'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Skeleton } from '@/components/atom/skeleton'
import type { QrDisplayProps } from './types'

export function QrDisplay({
  value,
  size = 240,
  alt = 'QR code',
  dataUrl,
  code,
  expiresAt,
}: QrDisplayProps) {
  const [src, setSrc] = useState<string | null>(dataUrl ?? null)

  useEffect(() => {
    if (dataUrl) {
      setSrc(dataUrl)
      return
    }
    let cancelled = false
    QRCode.toDataURL(value, { width: size, margin: 4 }).then(
      (url) => {
        if (!cancelled) setSrc(url)
      },
      () => {
        if (!cancelled) setSrc(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [value, size, dataUrl])

  if (!src) {
    return (
      <Skeleton
        style={{ width: size, height: size }}
        data-testid="qr-skeleton"
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="rounded border border-[var(--rule)] bg-white p-2"
      />
      {code ? (
        <div
          className="font-mono text-lg font-semibold"
          style={{ color: 'var(--brand-ink)', letterSpacing: '0.2em' }}
          data-testid="qr-code"
        >
          {code}
        </div>
      ) : null}
      {expiresAt ? <QrExpiry expiresAt={expiresAt} /> : null}
    </div>
  )
}

function QrExpiry({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState<number>(
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  )
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0')
  const ss = (remaining % 60).toString().padStart(2, '0')
  return (
    <span className="mono-label" data-testid="qr-expiry">
      หมดอายุใน {mm}:{ss}
    </span>
  )
}
