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
}: QrDisplayProps) {
  const [src, setSrc] = useState<string | null>(dataUrl ?? null)

  useEffect(() => {
    if (dataUrl) {
      setSrc(dataUrl)
      return
    }
    let cancelled = false
    QRCode.toDataURL(value, { width: size, margin: 1 }).then(
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
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded bg-white p-2"
    />
  )
}
