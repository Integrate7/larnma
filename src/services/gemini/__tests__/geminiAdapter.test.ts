import { __testing, createRealGeminiAdapter } from '../geminiAdapter'

const mockGenerateContent = jest.fn()

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  })),
}))

describe('geminiAdapter helpers', () => {
  const { parseJsonBlock, mapAnalysis, normalizeMood, normalizeIntent } =
    __testing

  it('parses JSON wrapped in code fences', () => {
    const raw = parseJsonBlock('```json\n{"mood":"HUNGRY"}\n```')
    expect(raw.mood).toBe('HUNGRY')
  })

  it('parses JSON with leading/trailing text', () => {
    const raw = parseJsonBlock('สวัสดี {"mood":"PAIN"} ครับ')
    expect(raw.mood).toBe('PAIN')
  })

  it('normalizes invalid mood to NORMAL', () => {
    expect(normalizeMood('WEIRD')).toBe('NORMAL')
    expect(normalizeMood(null)).toBe('NORMAL')
  })

  it('normalizes invalid intent to UNKNOWN', () => {
    expect(normalizeIntent('nope')).toBe('UNKNOWN')
  })

  it('maps raw analysis with fallbacks', () => {
    const r = mapAnalysis({ mood: 'HUNGRY', summary: 'หิว' }, 'keyword')
    expect(r.mood).toBe('HUNGRY')
    expect(r.intent).toBe('UNKNOWN')
    expect(r.transcript).toBe('keyword')
    expect(r.confidence).toBe(0.5)
    expect(r.entities).toEqual({})
  })

  it('uses (silent) when transcript and fallback empty', () => {
    const r = mapAnalysis({}, '')
    expect(r.transcript).toBe('(silent)')
    expect(r.summary).toBe('ไม่พบใจความเฉพาะ')
  })
})

describe('createRealGeminiAdapter', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
  })

  it('sends audio as inlineData and maps JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          '```json\n{"transcript":"ปวดท้อง","mood":"PAIN","intent":"PAIN","confidence":0.9,"summary":"ผู้สูงอายุกำลังเจ็บปวด","advice":"ลองนอนพักนะค้า","entities":{}}\n```',
      },
    })

    const adapter = createRealGeminiAdapter('test-key')
    const bytes = new Uint8Array([0x66, 0x61, 0x6b, 0x65]).buffer
    const audio = {
      type: 'audio/webm',
      arrayBuffer: () => Promise.resolve(bytes),
    } as unknown as Blob
    const r = await adapter.analyze({ audio })

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    const parts = mockGenerateContent.mock.calls[0][0]
    expect(parts[0]).toHaveProperty('text')
    expect(parts[1]).toHaveProperty('inlineData')
    expect(parts[1].inlineData.mimeType).toBe('audio/webm')
    expect(typeof parts[1].inlineData.data).toBe('string')

    expect(r.mood).toBe('PAIN')
    expect(r.intent).toBe('PAIN')
    expect(r.transcript).toBe('ปวดท้อง')
    expect(r.advice).toBe('ลองนอนพักนะค้า')
  })

  it('falls back to NORMAL when generateContent throws', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('boom'))
    const adapter = createRealGeminiAdapter('test-key')
    const r = await adapter.analyze({ hintKeyword: 'hint' })
    expect(r.mood).toBe('NORMAL')
    expect(r.intent).toBe('UNKNOWN')
    expect(r.transcript).toBe('hint')
  })

  it('sends text-only when no audio', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '{"mood":"HAPPY","summary":"ดี"}' },
    })
    const adapter = createRealGeminiAdapter('test-key')
    const r = await adapter.analyze({ hintKeyword: 'สบายดี' })
    const parts = mockGenerateContent.mock.calls[0][0]
    expect(parts).toHaveLength(2)
    expect(parts[1]).toHaveProperty('text')
    expect(r.mood).toBe('HAPPY')
  })
})
