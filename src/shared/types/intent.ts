export const INTENTS = [
  'HUNGRY',
  'PAIN',
  'DANGER',
  'LONELY',
  'CHAT',
  'UNKNOWN',
] as const

export type Intent = (typeof INTENTS)[number]
