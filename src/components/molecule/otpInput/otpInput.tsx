'use client'

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Input } from '@/components/atom/input'
import { cn } from '@/shared/helpers/cn'
import type { OtpInputProps } from './types'

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  'aria-label': ariaLabel,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) {
      refs.current[0]?.focus()
    }
  }, [autoFocus])

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replaceAll(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[i] = ch
    onChange(next.join(''))
    if (ch && i < length - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replaceAll(/\D/g, '').slice(0, length)
    if (!text) return
    e.preventDefault()
    onChange(text)
    const focusIdx = Math.min(text.length, length - 1)
    refs.current[focusIdx]?.focus()
  }

  return (
    <fieldset
      className="flex justify-center gap-2 border-0 p-0"
      aria-label={ariaLabel ?? 'OTP code'}
    >
      {digits.map((d, i) => {
        const key = `otp-${i}`
        return (
          <Input
            key={key}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`digit ${i + 1}`}
            className={cn('h-12 w-12 text-center text-xl')}
          />
        )
      })}
    </fieldset>
  )
}
