import { cn } from '@/shared/helpers/cn'
import type { StepperProps } from './types'

export function Stepper({ current, total, label }: StepperProps) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100))
  return (
    <div className="flex w-full flex-col gap-2">
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full bg-primary transition-all')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  )
}
