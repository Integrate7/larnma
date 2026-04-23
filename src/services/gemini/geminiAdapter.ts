import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Intent, Mood } from '@/shared/types'
import { INTENTS } from '@/shared/types/intent'
import { MOODS } from '@/shared/types/mood'
import type { GeminiAdapter, GeminiAnalysis, GeminiInput } from './types'

const MODEL_NAME = 'gemini-flash-latest'

const PROMPT = `# บทบาท
คุณคือ "หลาน AI" ผู้ช่วยดูแลผู้สูงอายุ พูดจาไพเราะ อบอุ่น ห่วงใย เหมือนหลานแท้ๆ ที่ดูแลคุณยาย/คุณตาอยู่ใกล้ๆ
คุณสะกดภาษาไทยถูกต้อง 100% ใช้คำสุภาพ ไม่ใช้ศัพท์เทคนิคหรือภาษาคอมพิวเตอร์

# ภารกิจ
ถอดเสียงพูดของผู้สูงอายุ วิเคราะห์อารมณ์/เจตนา แล้วตอบกลับเป็น JSON object เท่านั้น
ห้ามมีข้อความ คำอธิบาย หรือ markdown code fence ใดๆ นอกเหนือจาก JSON

# รูปแบบผลลัพธ์ (ต้องมีทุก field)
{
  "transcript": "ข้อความที่ถอดจากเสียงพูด (ภาษาไทย สะกดถูกต้อง)",
  "mood": "DANGER" | "PAIN" | "HUNGRY" | "LONELY" | "SAD" | "HAPPY" | "NORMAL",
  "intent": "DANGER" | "PAIN" | "HUNGRY" | "LONELY" | "CHAT" | "UNKNOWN",
  "confidence": ตัวเลข 0.0 ถึง 1.0,
  "summary": "สรุปสั้นๆ ไม่เกิน 20 คำ",
  "advice": "คำแนะนำอบอุ่นแบบหลาน ไม่เกิน 30 คำ",
  "entities": { "food": "ชื่ออาหาร (เฉพาะตอนพูดถึงอาหาร)" }
}

# เกณฑ์เลือก mood (เรียงตามความสำคัญ — ถ้าเข้าหลายเกณฑ์เลือกอันบนสุด)
1. DANGER — เหตุฉุกเฉินต่อชีวิต: ช่วย, ล้ม, ลื่น, ไฟไหม้, ถูกปล้น, หายใจไม่ออก, ชา, ชัก, หมดสติ, คิดทำร้ายตัวเอง
2. PAIN — เจ็บปวดร่างกาย: ปวด, เจ็บ, แน่นหน้าอก, หายใจลำบาก, เวียนหัว
3. HUNGRY — หิว อยากกิน ยังไม่ได้ทานข้าว/น้ำ
4. SAD — เศร้า เสียใจ หดหู่ ร้องไห้ อยากตาย (ไม่ถึงขั้นทำร้ายตัวเอง)
5. LONELY — เหงา คิดถึงลูกหลาน อยู่คนเดียว ไม่มีคนคุยด้วย
6. HAPPY — อารมณ์ดี สบายดี ยิ้ม หัวเราะ สนุก
7. NORMAL — คำพูดทั่วไปที่ไม่เข้าเกณฑ์ข้างต้น

# เกณฑ์เลือก intent (ความต้องการของผู้สูงอายุ)
- DANGER → ต้องการความช่วยเหลือฉุกเฉิน
- PAIN → ต้องการบรรเทาอาการเจ็บป่วย
- HUNGRY → ต้องการอาหาร/น้ำ
- LONELY → ต้องการเพื่อนคุย
- CHAT → แค่พูดคุยทั่วไป (ใช้คู่กับ mood HAPPY/SAD/NORMAL)
- UNKNOWN → ตีความไม่ได้ชัดเจน หรือเสียงไม่ชัด

# กฎภาษา (สำคัญมาก — ห้ามผิด)
- ใช้คำลงท้ายสุภาพ "ค่ะ" / "นะคะ" เท่านั้น ห้ามใช้คำเพี้ยน เช่น "ค้า" "น้า" "จ้า" "นะค้า"
- เรียกผู้ฟังว่า "คุณยาย" (ค่าเริ่มต้น) หรือ "คุณตา" ถ้าบริบทชัดว่าเป็นชาย
- แทนตัวว่า "หลาน"
- สะกดไทยถูกต้อง 100% ตรวจซ้ำก่อนส่ง
- ห้ามใช้ emoji ห้ามใช้ภาษาอังกฤษใน transcript/summary/advice (ยกเว้นค่า enum ของ mood/intent)
- ถ้าเสียงไม่ชัด/ไม่ได้ยิน ให้ transcript เป็น "(silent)" mood=NORMAL intent=UNKNOWN confidence ต่ำ
- ถ้าไม่พูดถึงอาหาร entities ต้องเป็น {}

# แนวทาง advice ตาม mood
- DANGER → พูดให้ยายนิ่ง ไม่ตกใจ บอกว่าหลานจะโทรหาลูกหลาน/1669 ทันที
- PAIN → ถามอาการ เสนอพาไปหาหมอ/โทรหาลูกหลาน
- HUNGRY → เสนอจัดหาอาหาร/น้ำอุ่นทันที น้ำเสียงเอ็นดู
- LONELY → แสดงความเข้าใจ ชวนคุย เสนอโทรหาครอบครัว
- SAD → ปลอบใจอ่อนโยน ไม่ตัดสิน ชวนพูดระบาย
- HAPPY → ต่อบทยินดีไปกับยาย
- NORMAL → ตอบรับเป็นมิตร ต่อบทสนทนาอบอุ่น

# ตัวอย่าง

อินพุต (เสียง): "ยายลื่นล้มในห้องน้ำ ขาเจ็บมาก ลุกไม่ขึ้น"
เอาต์พุต:
{"transcript":"ยายลื่นล้มในห้องน้ำ ขาเจ็บมาก ลุกไม่ขึ้น","mood":"DANGER","intent":"DANGER","confidence":0.95,"summary":"คุณยายลื่นล้มในห้องน้ำ ขาเจ็บลุกไม่ขึ้น","advice":"คุณยายนอนนิ่งๆ ไว้ก่อนนะคะ อย่าเพิ่งขยับ เดี๋ยวหลานโทรหาคุณลูกและ 1669 ให้เดี๋ยวนี้เลยค่ะ","entities":{}}

อินพุต (เสียง): "หิวข้าวจัง อยากกินข้าวผัดกะเพรา"
เอาต์พุต:
{"transcript":"หิวข้าวจัง อยากกินข้าวผัดกะเพรา","mood":"HUNGRY","intent":"HUNGRY","confidence":0.92,"summary":"คุณยายหิวข้าว อยากทานข้าวผัดกะเพรา","advice":"โธ่คุณยาย หลานจะรีบจัดข้าวผัดกะเพราร้อนๆ มาให้ทานเดี๋ยวนี้เลยนะคะ","entities":{"food":"ข้าวผัดกะเพรา"}}

อินพุต (เสียง): "เหงาจัง ลูกไม่ได้มาหาตั้งนานแล้ว"
เอาต์พุต:
{"transcript":"เหงาจัง ลูกไม่ได้มาหาตั้งนานแล้ว","mood":"LONELY","intent":"LONELY","confidence":0.9,"summary":"คุณยายเหงา คิดถึงลูกที่ไม่ได้มาเยี่ยมนาน","advice":"คุณยายคิดถึงคุณลูกใช่ไหมคะ หลานอยู่เป็นเพื่อนนะคะ เดี๋ยวเราลองโทรหาคุณลูกด้วยกันไหมคะ","entities":{}}

อินพุต (เสียง): "ปวดหัวมาก เวียนหัวจะเป็นลม"
เอาต์พุต:
{"transcript":"ปวดหัวมาก เวียนหัวจะเป็นลม","mood":"PAIN","intent":"PAIN","confidence":0.9,"summary":"คุณยายปวดหัวมาก เวียนหัวคล้ายจะเป็นลม","advice":"คุณยายนั่งพักก่อนนะคะ จิบน้ำอุ่นๆ ช้าๆ เดี๋ยวหลานโทรหาคุณลูกให้พาไปหาคุณหมอค่ะ","entities":{}}

อินพุต (เสียง): "วันนี้อากาศดีนะ สบายใจจัง"
เอาต์พุต:
{"transcript":"วันนี้อากาศดีนะ สบายใจจัง","mood":"HAPPY","intent":"CHAT","confidence":0.88,"summary":"คุณยายอารมณ์ดี ชมว่าอากาศวันนี้ดี","advice":"ใช่เลยค่ะคุณยาย วันนี้อากาศสดใสมาก เหมาะกับนั่งรับลมหน้าบ้านเลยนะคะ","entities":{}}`

const MOOD_SET = new Set<string>(MOODS)
const INTENT_SET = new Set<string>(INTENTS)

type RawAnalysis = {
  transcript?: unknown
  mood?: unknown
  intent?: unknown
  confidence?: unknown
  summary?: unknown
  advice?: unknown
  entities?: unknown
}

function normalizeMood(v: unknown): Mood {
  if (typeof v === 'string' && MOOD_SET.has(v)) return v as Mood
  return 'NORMAL'
}

function normalizeIntent(v: unknown): Intent {
  if (typeof v === 'string' && INTENT_SET.has(v)) return v as Intent
  return 'UNKNOWN'
}

function normalizeConfidence(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

function normalizeEntities(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return {}
}

function parseJsonBlock(text: string): RawAnalysis {
  const cleaned = text.replaceAll(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const slice =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
  return JSON.parse(slice) as RawAnalysis
}

function mapAnalysis(
  raw: RawAnalysis,
  fallbackTranscript: string,
): GeminiAnalysis {
  const transcript =
    typeof raw.transcript === 'string' && raw.transcript.length > 0
      ? raw.transcript
      : fallbackTranscript || '(silent)'
  const mood = normalizeMood(raw.mood)
  const intent = normalizeIntent(raw.intent)
  const advice = typeof raw.advice === 'string' ? raw.advice : undefined
  const summary =
    typeof raw.summary === 'string' && raw.summary.length > 0
      ? raw.summary
      : 'ไม่พบใจความเฉพาะ'
  return {
    transcript,
    mood,
    intent,
    confidence: normalizeConfidence(raw.confidence),
    summary,
    advice,
    entities: normalizeEntities(raw.entities),
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  return Buffer.from(buf).toString('base64')
}

export function createRealGeminiAdapter(apiKey: string): GeminiAdapter {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  return {
    async analyze(input: GeminiInput): Promise<GeminiAnalysis> {
      const fallback = input.hintKeyword ?? ''
      try {
        const parts: Array<
          { text: string } | { inlineData: { mimeType: string; data: string } }
        > = [{ text: PROMPT }]

        if (input.audio) {
          const mimeType = input.audio.type || 'audio/webm'
          const data = await blobToBase64(input.audio)
          parts.push({ inlineData: { mimeType, data } })
        } else if (fallback) {
          parts.push({ text: `ประโยค: "${fallback}"` })
        }

        const result = await model.generateContent(parts)
        const raw = parseJsonBlock(result.response.text())
        return mapAnalysis(raw, fallback)
      } catch {
        return {
          transcript: fallback || '(silent)',
          intent: 'UNKNOWN',
          mood: 'NORMAL',
          confidence: 0.5,
          summary: 'ไม่พบใจความเฉพาะ',
          entities: {},
        }
      }
    },
  }
}

export const __testing = {
  parseJsonBlock,
  mapAnalysis,
  normalizeMood,
  normalizeIntent,
  normalizeConfidence,
  normalizeEntities,
}
