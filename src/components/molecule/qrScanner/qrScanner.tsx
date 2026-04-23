'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { QrScannerProps } from './types'

export function QrScanner({ onDecode, onError, disabled }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (disabled) return
    const reader = new BrowserMultiFormatReader()
    let stopped = false
    // Cleanup handle for the scanner controls (returned by decodeFromVideoDevice)
    let controls: { stop: () => void } | null = null

    const start = async () => {
      try {
        if (!videoRef.current) return
        const result = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (r, err) => {
            if (stopped) return
            if (r) {
              const text = r.getText()
              console.log('QR scanned successfully:', text)
              onDecode(text)
            } else if (err && err.name !== 'NotFoundException') {
              setError(err.message)
              onError?.(err as Error)
            }
          },
        )
        controls = result
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        setError(err.message)
        onError?.(err)
      }
    }

    void start()

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [onDecode, onError, disabled])

  return (
    <div className="relative w-full max-w-sm" data-slot="qr-scanner">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        >
          <track kind="captions" />
        </video>
        <span className="pointer-events-none absolute left-2 top-2 h-6 w-6 rounded-tl border-l-[3px] border-t-[3px] border-[var(--brand)]" />
        <span className="pointer-events-none absolute right-2 top-2 h-6 w-6 rounded-tr border-r-[3px] border-t-[3px] border-[var(--brand)]" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-6 w-6 rounded-bl border-b-[3px] border-l-[3px] border-[var(--brand)]" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 rounded-br border-b-[3px] border-r-[3px] border-[var(--brand)]" />
        <span
          className="pointer-events-none absolute left-2 right-2 top-1/2 h-0.5 bg-[var(--brand)]"
          style={{ boxShadow: '0 0 8px var(--brand)' }}
        />
      </div>
      {error ? (
        <p className="mt-2 serif-caption" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
