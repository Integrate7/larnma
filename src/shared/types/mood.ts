export const MOODS = [
  'DANGER',
  'PAIN',
  'HUNGRY',
  'LONELY',
  'SAD',
  'HAPPY',
  'NORMAL',
] as const

export type Mood = (typeof MOODS)[number]

export type Priority = 'critical' | 'high' | 'normal' | 'log'

export const MOOD_PRIORITY: Record<Mood, Priority> = {
  DANGER: 'critical',
  PAIN: 'high',
  SAD: 'high',
  HUNGRY: 'normal',
  LONELY: 'normal',
  HAPPY: 'log',
  NORMAL: 'log',
}

export const MOOD_LABEL_TH: Record<Mood, string> = {
  DANGER: 'ฉุกเฉิน',
  PAIN: 'เจ็บปวด',
  HUNGRY: 'หิว',
  LONELY: 'เหงา',
  SAD: 'เศร้า',
  HAPPY: 'อารมณ์ดี',
  NORMAL: 'ปกติ',
}
