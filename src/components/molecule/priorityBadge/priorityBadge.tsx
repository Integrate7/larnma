import type { Priority } from '@/shared/types'
import type { PriorityBadgeProps } from './types'

const LABEL: Record<Priority, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  normal: 'NORMAL',
  log: 'LOG',
}

const COLOR: Record<Priority, string> = {
  critical: 'var(--danger)',
  high: 'var(--mood-pain)',
  normal: 'var(--brand-ink)',
  log: 'var(--ok)',
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className="mono-label"
      style={{ color: COLOR[priority] }}
      data-slot="priority-badge"
      data-priority={priority}
    >
      {priority === 'critical' ? '● ' : ''}
      {LABEL[priority]}
    </span>
  )
}
