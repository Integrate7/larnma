import type { Priority } from '@/shared/types'
import type { PriorityBadgeProps } from './types'

const LABEL: Record<Priority, string> = {
  critical: '🚨 ฉุกเฉิน',
  high: '⚠️ สำคัญ',
  normal: 'ℹ️ ปกติ',
  log: '📊 บันทึก',
}

const CLASS: Record<Priority, string> = {
  critical: 'bg-mood-danger text-white',
  high: 'bg-mood-pain text-white',
  normal: 'bg-mood-normal text-white',
  log: 'bg-muted text-muted-foreground',
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASS[priority]}`}
      data-slot="priority-badge"
      data-priority={priority}
    >
      {LABEL[priority]}
    </span>
  )
}
