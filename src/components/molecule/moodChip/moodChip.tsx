import { MOOD_LABEL_TH, type Mood } from '@/shared/types'
import type { MoodChipProps } from './types'

const MOOD_CLASS: Record<Mood, string> = {
  DANGER: 'bg-mood-danger text-white',
  PAIN: 'bg-mood-pain text-white',
  SAD: 'bg-mood-sad text-white',
  LONELY: 'bg-mood-lonely text-white',
  HUNGRY: 'bg-mood-hungry text-white',
  HAPPY: 'bg-mood-happy text-white',
  NORMAL: 'bg-mood-normal text-white',
}

export function MoodChip({ mood, label }: MoodChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${MOOD_CLASS[mood]}`}
      data-slot="mood-chip"
      data-mood={mood}
    >
      {label ?? MOOD_LABEL_TH[mood]}
    </span>
  )
}
