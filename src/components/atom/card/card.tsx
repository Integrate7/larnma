import { forwardRef } from 'react'
import { cn } from '@/shared/helpers/cn'
import type { CardProps } from './types'

const ACCENT_CLASS: Record<'log' | 'normal' | 'crit', string> = {
  log: 'border-l-[3px] border-l-[var(--ok)]',
  normal: 'border-l-[3px] border-l-[var(--brand)]',
  crit: 'bg-[var(--danger-wash)] border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))]',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, accent, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card"
      data-accent={accent}
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        accent ? ACCENT_CLASS[accent] : '',
        className,
      )}
      {...props}
    />
  )
})

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 p-6', className)}
        {...props}
      />
    )
  },
)

export const CardTitle = forwardRef<HTMLDivElement, CardProps>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('font-semibold leading-none', className)}
        {...props}
      />
    )
  },
)

export const CardDescription = forwardRef<HTMLDivElement, CardProps>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      />
    )
  },
)

export const CardContent = forwardRef<HTMLDivElement, CardProps>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  },
)

export const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
      />
    )
  },
)
