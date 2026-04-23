import type { HTMLAttributes } from 'react'

export type BadgeVariant = 'default' | 'outline' | 'destructive' | 'secondary'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}
