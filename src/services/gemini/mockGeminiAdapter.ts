import type { GeminiAdapter, GeminiAnalysis, GeminiInput } from './types'
import type { Intent, Mood } from '@/shared/types'

type Rule = {
  mood: Mood
  intent: Intent
  summary: string
  keywords: string[]
  entities?: Record<string, unknown>
}

const RULES: Rule[] = [
  {
    mood: 'DANGER',
    intent: 'DANGER',
    summary: 'ผู้สูงอายุดูเหมือนจะพบเหตุฉุกเฉิน',
    keywords: ['ช่วย', 'ล้ม', 'ลื่น', 'ไฟไหม้', 'ปล้น', 'หายใจไม่ออก'],
  },
  {
    mood: 'PAIN',
    intent: 'PAIN',
    summary: 'ผู้สูงอายุกำลังเจ็บปวด',
    keywords: ['เจ็บ', 'ปวด', 'หายใจลำบาก'],
  },
  {
    mood: 'HUNGRY',
    intent: 'HUNGRY',
    summary: 'ผู้สูงอายุหิว',
    keywords: ['หิว', 'กินข้าว', 'อยากกิน'],
  },
  {
    mood: 'SAD',
    intent: 'CHAT',
    summary: 'ผู้สูงอายุรู้สึกเศร้า',
    keywords: ['เศร้า', 'เสียใจ', 'หดหู่', 'อยากตาย'],
  },
  {
    mood: 'LONELY',
    intent: 'LONELY',
    summary: 'ผู้สูงอายุเหงา อยากคุย',
    keywords: ['เหงา', 'คิดถึง', 'อยากคุย', 'ไม่มีใคร'],
  },
  {
    mood: 'HAPPY',
    intent: 'CHAT',
    summary: 'ผู้สูงอายุอารมณ์ดี',
    keywords: ['สบายดี', 'ยิ้ม', 'ดีใจ', 'สนุก'],
  },
]

function findRule(text: string): Rule | undefined {
  const lower = text.toLowerCase()
  for (const r of RULES) {
    for (const kw of r.keywords) {
      if (lower.includes(kw.toLowerCase())) return r
    }
  }
  return undefined
}

function extractEntities(text: string, mood: Mood): Record<string, unknown> {
  if (mood !== 'HUNGRY') return {}
  const foodMatch = text.match(/(ข้าว[^\s,]*|ก๋วยเตี๋ยว|ส้มตำ|ผัด[^\s,]*)/)
  return foodMatch ? { food: foodMatch[1] } : {}
}

export function createMockGeminiAdapter(): GeminiAdapter {
  return {
    async analyze(input: GeminiInput): Promise<GeminiAnalysis> {
      const transcript = input.hintKeyword ?? ''
      const rule = findRule(transcript)
      if (!rule) {
        return {
          transcript: transcript || '(silent)',
          intent: 'UNKNOWN',
          mood: 'NORMAL',
          confidence: 0.5,
          summary: 'ไม่พบใจความเฉพาะ',
          entities: {},
        }
      }
      return {
        transcript: transcript || rule.keywords[0],
        intent: rule.intent,
        mood: rule.mood,
        confidence: 0.9,
        summary: rule.summary,
        entities: extractEntities(transcript, rule.mood),
      }
    },
  }
}
