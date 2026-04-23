import type { HTMLAttributes } from 'react'

export type CardAccent = 'log' | 'normal' | 'crit'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: CardAccent
}
