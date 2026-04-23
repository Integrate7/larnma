/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueDeviceSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { GET } from '../route'

function req(cookie?: string) {
  return new NextRequest('http://localhost:3000/api/elder/food/menus', {
    method: 'GET',
    headers: { host: 'localhost:3000', ...(cookie ? { cookie } : {}) },
  })
}

async function bootElder(allergies: string[] = [], conditions: string[] = [], foodDislikes: string[] = []) {
  const repo = getRepository()
  const elder = repo.createUser({ role: 'elder', phone: '0811', name: 'ย่า' })
  repo.createElderProfile({
    userId: elder.id,
    addressLine: 'a',
    district: 'd',
    province: 'p',
    postalCode: '10100',
    conditions,
    symptoms: [],
    medications: [],
    allergies,
    foodPreferences: [],
    foodDislikes,
  })
  const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
  return { elderId: elder.id, cookie: `${COOKIES.device}=${s.token}` }
}

async function bootCaregiver() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const { issueCaregiverSession } = await import('@/services/auth')
  const s = await issueCaregiverSession({ userId: cg.id })
  return `${COOKIES.access}=${s.accessToken}`
}

describe('GET /api/elder/food/menus', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await GET(req())
    expect(r.status).toBe(401)
  })

  it('rejects caregiver access token (requireDevice returns 401)', async () => {
    const cookie = await bootCaregiver()
    const r = await GET(req(cookie))
    expect(r.status).toBe(401)
  })

  it('returns menu items for elder with no restrictions', async () => {
    const { cookie } = await bootElder()
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items[0]).toHaveProperty('isSafe')
    expect(body.items[0]).toHaveProperty('suggestedAlternative')
  })

  it('marks items as unsafe when elder has matching allergy', async () => {
    const { cookie } = await bootElder(['กุ้ง'])
    const r = await GET(req(cookie))
    const body = await r.json()
    const kungItems = body.items.filter((i: { allergyMatch: string[] }) => i.allergyMatch.includes('กุ้ง'))
    for (const item of kungItems) {
      expect(item.isSafe).toBe(false)
    }
  })

  it('safe items come first (max 3)', async () => {
    const { cookie } = await bootElder()
    const r = await GET(req(cookie))
    const body = await r.json()
    const safeItems = body.items.filter((i: { isSafe: boolean }) => i.isSafe)
    expect(safeItems.length).toBeLessThanOrEqual(3)
    if (safeItems.length > 0 && body.items.length > safeItems.length) {
      const firstUnsafeIdx = body.items.findIndex((i: { isSafe: boolean }) => !i.isSafe)
      const lastSafeIdx = body.items.map((i: { isSafe: boolean }) => i.isSafe).lastIndexOf(true)
      expect(lastSafeIdx).toBeLessThan(firstUnsafeIdx)
    }
  })

  it('suggests safe alternatives for unsafe items', async () => {
    const { cookie } = await bootElder(['กุ้ง'])
    const r = await GET(req(cookie))
    const body = await r.json()
    const unsafeItems = body.items.filter((i: { isSafe: boolean }) => !i.isSafe)
    for (const item of unsafeItems) {
      expect(item).toHaveProperty('suggestedAlternative')
    }
  })

  it('food dislikes mark item as unsafe', async () => {
    const { cookie } = await bootElder([], [], ['ข้าวผัดกะเพราไก่'])
    const r = await GET(req(cookie))
    const body = await r.json()
    const disliked = body.items.find((i: { name: string }) => i.name === 'ข้าวผัดกะเพราไก่')
    if (disliked) {
      expect(disliked.isSafe).toBe(false)
    }
  })

  it('returns items even when elder has no profile (null profile fallback)', async () => {
    const repo = getRepository()
    const elder = repo.createUser({ role: 'elder', phone: '0811', name: 'ย่า' })
    const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
    const r = await GET(req(`${COOKIES.device}=${s.token}`))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(Array.isArray(body.items)).toBe(true)
  })
})
