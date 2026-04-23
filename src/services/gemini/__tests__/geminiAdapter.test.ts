import { __testing, createRealGeminiAdapter } from '../geminiAdapter'

const mockGenerateContent = jest.fn()
const mockGetGenerativeModel = jest.fn((_cfg: { model: string }) => ({
  generateContent: mockGenerateContent,
}))

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: (cfg: { model: string }) => mockGetGenerativeModel(cfg),
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

describe('getModelChain', () => {
  const { getModelChain, DEFAULT_MODEL_CHAIN } = __testing
  const originalEnv = process.env.GEMINI_MODELS

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.GEMINI_MODELS
    else process.env.GEMINI_MODELS = originalEnv
  })

  it('returns the default chain when GEMINI_MODELS is unset', () => {
    delete process.env.GEMINI_MODELS
    expect(getModelChain()).toEqual([...DEFAULT_MODEL_CHAIN])
  })

  it('parses comma-separated env override', () => {
    process.env.GEMINI_MODELS = ' a , b ,, c '
    expect(getModelChain()).toEqual(['a', 'b', 'c'])
  })

  it('falls back to defaults when env is empty/whitespace', () => {
    process.env.GEMINI_MODELS = '   '
    expect(getModelChain()).toEqual([...DEFAULT_MODEL_CHAIN])
  })
})

describe('isQuotaExhausted', () => {
  const { isQuotaExhausted } = __testing

  it('detects http status 429', () => {
    expect(isQuotaExhausted({ status: 429 })).toBe(true)
  })

  it('detects RESOURCE_EXHAUSTED and quota in message', () => {
    expect(isQuotaExhausted(new Error('RESOURCE_EXHAUSTED: quota hit'))).toBe(
      true,
    )
    expect(isQuotaExhausted(new Error('you exceeded your quota'))).toBe(true)
    expect(isQuotaExhausted('Got 429 from server')).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isQuotaExhausted(new Error('network fail'))).toBe(false)
    expect(isQuotaExhausted(null)).toBe(false)
    expect(isQuotaExhausted(undefined)).toBe(false)
  })
})

describe('createRealGeminiAdapter', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
    mockGetGenerativeModel.mockClear()
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
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGenerateContent.mockRejectedValueOnce(new Error('boom'))
    const adapter = createRealGeminiAdapter('test-key')
    const r = await adapter.analyze({ hintKeyword: 'hint' })
    expect(r.mood).toBe('NORMAL')
    expect(r.intent).toBe('UNKNOWN')
    expect(r.transcript).toBe('hint')
    err.mockRestore()
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

  it('rotates to next model on 429 quota error and sticks to it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const quotaErr = Object.assign(new Error('RESOURCE_EXHAUSTED'), {
      status: 429,
    })
    mockGenerateContent
      .mockRejectedValueOnce(quotaErr)
      .mockResolvedValueOnce({
        response: { text: () => '{"mood":"HUNGRY","summary":"หิว"}' },
      })
      .mockResolvedValueOnce({
        response: { text: () => '{"mood":"HAPPY","summary":"ดี"}' },
      })

    const adapter = createRealGeminiAdapter('test-key')

    const first = await adapter.analyze({ hintKeyword: 'หิว' })
    expect(first.mood).toBe('HUNGRY')
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(2)
    expect(mockGetGenerativeModel.mock.calls[0][0].model).toBe(
      'gemini-flash-latest',
    )
    expect(mockGetGenerativeModel.mock.calls[1][0].model).toBe(
      'gemini-2.5-flash',
    )

    const second = await adapter.analyze({ hintKeyword: 'ดี' })
    expect(second.mood).toBe('HAPPY')
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(3)
    expect(mockGetGenerativeModel.mock.calls[2][0].model).toBe(
      'gemini-2.5-flash',
    )

    warn.mockRestore()
  })

  it('returns fallback when all models exhaust quota', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    const quotaErr = Object.assign(new Error('quota exceeded'), { status: 429 })
    mockGenerateContent
      .mockRejectedValueOnce(quotaErr)
      .mockRejectedValueOnce(quotaErr)
      .mockRejectedValueOnce(quotaErr)

    const adapter = createRealGeminiAdapter('test-key')
    const r = await adapter.analyze({ hintKeyword: 'hint' })

    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(3)
    expect(r.mood).toBe('NORMAL')
    expect(r.intent).toBe('UNKNOWN')
    expect(r.transcript).toBe('hint')
    expect(err).toHaveBeenCalledWith(
      '[gemini] all models exhausted; returning fallback',
    )

    warn.mockRestore()
    err.mockRestore()
  })

  it('does not rotate on non-quota errors', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGenerateContent.mockRejectedValueOnce(new Error('network down'))

    const adapter = createRealGeminiAdapter('test-key')
    const r = await adapter.analyze({ hintKeyword: 'hi' })

    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1)
    expect(r.mood).toBe('NORMAL')
    expect(r.intent).toBe('UNKNOWN')

    err.mockRestore()
  })
})
