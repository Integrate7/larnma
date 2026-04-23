import { cn } from '@/shared/helpers/cn'
import type { StepperProps } from './types'

export function Stepper({ current, total, label }: StepperProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}
      <progress
        className={cn('h-2 w-full overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary transition-all')}
        value={current}
        max={total}
        aria-label={label}
      />
    </div>
  )
}
