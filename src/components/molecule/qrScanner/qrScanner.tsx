'use client'

import { BrowserQRCodeReader } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'
import { useEffect, useRef, useState } from 'react'
import type { QrScannerProps } from './types'

const TRANSIENT_DECODE_ERRORS = new Set([
  'NotFoundException',
  'ChecksumException',
  'FormatException',
])

export function QrScanner({ onDecode, onError, disabled }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onDecodeRef = useRef(onDecode)
  const onErrorRef = useRef(onError)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDecodeRef.current = onDecode
    onErrorRef.current = onError
  })

  useEffect(() => {
    if (disabled) return
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserQRCodeReader(hints)
    let cancelled = false
    let controls: { stop: () => void } | null = null

    // Defer start: React StrictMode in dev runs mount → cleanup → remount
    // synchronously. Without this delay, the discarded mount calls getUserMedia,
    // attaches a stream, and its stop() wipes videoElement.srcObject right after
    // the real mount installed its own stream — resulting in a black video.
    const startTimer = setTimeout(async () => {
      try {
        if (!videoRef.current) return
        const result = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (r, err) => {
            if (cancelled) return
            if (r) {
              onDecodeRef.current(r.getText())
            } else if (err && !TRANSIENT_DECODE_ERRORS.has(err.name)) {
              setError(err.message)
              onErrorRef.current?.(err as Error)
            }
          },
        )
        if (cancelled) {
          result.stop()
          return
        }
        controls = result
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        setError(err.message)
        onErrorRef.current?.(err)
      }
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(startTimer)
      controls?.stop()
    }
  }, [disabled])

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
        <p
          className="mt-2 serif-caption"
          role="alert"
          style={{ color: 'var(--danger)' }}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
