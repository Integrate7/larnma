/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { __setRepository, createInMemoryRepository } from '@/services/repository'
import { POST } from '../route'

function req() {
  return new NextRequest('http://localhost:3000/api/test-seed', { method: 'POST' })
}

describe('POST /api/test-seed', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('returns 200 with seeded data in non-production', async () => {
    const r = await POST(req())
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.ok).toBe(true)
    expect(body.caregiver).toHaveProperty('id')
    expect(body.caregiver.phone).toBe('0800000001')
    expect(body.elder).toHaveProperty('id')
    expect(body.elder.phone).toBe('0800000002')
    expect(body.elder.allergies).toContain('กุ้ง')
    expect(body.elder.conditions).toContain('เบาหวาน')
  })

  it('sets session cookies on response', async () => {
    const r = await POST(req())
    expect(r.status).toBe(200)
    const setCookie = r.headers.get('set-cookie') ?? r.headers.getSetCookie?.()?.join('; ') ?? ''
    expect(setCookie.length).toBeGreaterThan(0)
  })

  it('returns 404 in production environment', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
    const r = await POST(req())
    expect(r.status).toBe(404)
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true })
  })
})
