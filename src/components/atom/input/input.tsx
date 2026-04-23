import { forwardRef } from 'react'
import { cn } from '@/shared/helpers/cn'
import type { InputProps } from './types'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/30 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
    )
  },
)
