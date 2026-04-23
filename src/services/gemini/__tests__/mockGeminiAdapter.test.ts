import { createMockGeminiAdapter } from '../mockGeminiAdapter'

describe('MockGeminiAdapter', () => {
  const a = createMockGeminiAdapter()

  it('detects HUNGRY with food entity', async () => {
    const r = await a.analyze({ hintKeyword: 'หิว อยากกินข้าวผัด' })
    expect(r.mood).toBe('HUNGRY')
    expect(r.intent).toBe('HUNGRY')
    expect(r.entities.food).toContain('ข้าวผัด')
  })

  it('detects PAIN', async () => {
    const r = await a.analyze({ hintKeyword: 'ปวดเข่ามาก' })
    expect(r.mood).toBe('PAIN')
  })

  it('detects DANGER', async () => {
    const r = await a.analyze({ hintKeyword: 'ช่วยด้วย ล้ม' })
    expect(r.mood).toBe('DANGER')
  })

  it('detects SAD', async () => {
    const r = await a.analyze({ hintKeyword: 'เศร้าจังเลย' })
    expect(r.mood).toBe('SAD')
  })

  it('detects LONELY', async () => {
    const r = await a.analyze({ hintKeyword: 'เหงา อยากคุย' })
    expect(r.mood).toBe('LONELY')
  })

  it('detects HAPPY', async () => {
    const r = await a.analyze({ hintKeyword: 'วันนี้สบายดี ยิ้ม' })
    expect(r.mood).toBe('HAPPY')
  })

  it('returns NORMAL/UNKNOWN when no keyword matches', async () => {
    const r = await a.analyze({ hintKeyword: 'แค่พูดมาเรื่อยๆ' })
    expect(r.mood).toBe('NORMAL')
    expect(r.intent).toBe('UNKNOWN')
  })

  it('returns NORMAL when empty input', async () => {
    const r = await a.analyze({})
    expect(r.mood).toBe('NORMAL')
  })
})
