import { Loader2, Mic, MicOff } from 'lucide-react'
import { cn } from '@/shared/helpers/cn'
import type { MicButtonProps, MicButtonState } from './types'

const STATE_CLASS: Record<MicButtonState, string> = {
  idle: 'bg-primary hover:bg-primary/90',
  wakeListening: 'bg-primary/80 ring-4 ring-primary/30 animate-pulse',
  listening: 'bg-destructive animate-pulse',
  uploading: 'bg-primary/70',
  done: 'bg-mood-happy',
  error: 'bg-muted',
}

const LABEL_DEFAULT: Record<MicButtonState, string> = {
  idle: 'แตะเพื่อพูด',
  wakeListening: 'พูด "หลานม่า" ได้เลย',
  listening: 'กำลังฟัง...',
  uploading: 'กำลังส่ง...',
  done: 'เรียบร้อย',
  error: 'ลองใหม่',
}

export function MicButton({ state, onPress, disabled, label }: MicButtonProps) {
  const isBusy =
    state === 'listening' || state === 'uploading' || state === 'wakeListening'
  const Icon =
    state === 'uploading' ? Loader2 : state === 'error' ? MicOff : Mic
  const shownLabel = label ?? LABEL_DEFAULT[state]
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label={shownLabel}
        data-slot="mic-button"
        data-testid="mic-button"
        data-state={state}
        className={cn(
          'flex h-48 w-48 items-center justify-center rounded-full text-white shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-primary/40 disabled:opacity-50',
          STATE_CLASS[state],
        )}
      >
        <Icon
          className={cn(
            'h-20 w-20',
            state === 'uploading' ? 'animate-spin' : '',
          )}
          aria-hidden="true"
        />
      </button>
      <span
        className={cn(
          'text-2xl font-medium',
          isBusy ? 'text-destructive' : 'text-foreground',
        )}
      >
        {shownLabel}
      </span>
    </div>
  )
}
