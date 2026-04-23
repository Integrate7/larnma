import { MOOD_LABEL_TH, type Mood } from '@/shared/types'
import type { MoodChipProps } from './types'

const MOOD_COLOR: Record<Mood, string> = {
  DANGER: 'var(--mood-danger)',
  PAIN: 'var(--mood-pain)',
  SAD: 'var(--mood-sad)',
  LONELY: 'var(--mood-lonely)',
  HUNGRY: 'var(--mood-hungry)',
  HAPPY: 'var(--mood-happy)',
  NORMAL: 'var(--mood-normal)',
}

export function MoodChip({ mood, label }: MoodChipProps) {
  return (
    <span
      className="mono-label"
      style={{ color: MOOD_COLOR[mood] }}
      data-slot="mood-chip"
      data-mood={mood}
    >
      {label ?? MOOD_LABEL_TH[mood]}
    </span>
  )
}
