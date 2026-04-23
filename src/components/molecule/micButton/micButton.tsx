import { Loader2, Mic, MicOff } from 'lucide-react'
import { cn } from '@/shared/helpers/cn'
import type { MicButtonProps, MicButtonState } from './types'

const LABEL_DEFAULT: Record<MicButtonState, string> = {
  idle: 'แตะเพื่อพูด',
  wakeListening: 'พูด "หลานรัก" ได้เลย',
  listening: 'กำลังฟัง...',
  uploading: 'กำลังส่ง...',
  done: 'เรียบร้อย',
  error: 'ลองใหม่',
}

const BAR_HEIGHTS = ['50%', '90%', '30%', '80%', '60%']

function ListeningBars() {
  return (
    <div className="flex h-9 items-end gap-1">
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-white animate-pulse"
          style={{ height: h, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

export function MicButton({ state, onPress, disabled, label }: MicButtonProps) {
  const shownLabel = label ?? LABEL_DEFAULT[state]

  const circleBg =
    state === 'error'
      ? 'radial-gradient(circle at 40% 35%, oklch(0.58 0.2 28), oklch(0.4 0.2 28))'
      : state === 'done'
      ? 'radial-gradient(circle at 40% 35%, var(--ok), oklch(0.38 0.12 160))'
      : 'radial-gradient(circle at 40% 35%, oklch(0.52 0.2 300), oklch(0.32 0.2 300))'

  const ringShadow =
    '0 0 0 6px color-mix(in oklch, var(--brand) 14%, transparent), 0 0 0 14px color-mix(in oklch, var(--brand) 6%, transparent)'

  const Icon =
    state === 'uploading' ? Loader2 : state === 'error' ? MicOff : Mic

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label={shownLabel}
        data-slot="mic-button"
        data-testid="mic-button"
        data-state={state}
        className={cn(
          'grid place-items-center rounded-full text-white transition-transform focus:outline-none disabled:opacity-50 active:scale-[0.98]',
        )}
        style={{ width: 130, height: 130, background: circleBg, boxShadow: ringShadow }}
      >
        {state === 'listening' ? (
          <ListeningBars />
        ) : (
          <Icon
            className={cn('h-14 w-14', state === 'uploading' ? 'animate-spin' : '')}
            aria-hidden="true"
          />
        )}
      </button>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-base font-semibold text-[var(--ink)] tracking-tight">
          {shownLabel}
        </span>
      </div>
    </div>
  )
}
