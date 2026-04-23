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
              onDecode(r.getText())
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
    <div className="relative w-full max-w-sm">
      <video
        ref={videoRef}
        className="aspect-square w-full rounded-lg bg-black"
        muted
        playsInline
      >
        <track kind="captions" />
      </video>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
