/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { POST } from '../route'

function req() {
  return new NextRequest('http://localhost:3000/api/test-reset', { method: 'POST' })
}

describe('POST /api/test-reset', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('returns 200 and resets state in non-production', async () => {
    const repo = getRepository()
    repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })

    const r = await POST(req())
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toEqual({ ok: true })
  })

  it('returns 404 in production environment', async () => {
    const orig = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true })
    const r = await POST(req())
    expect(r.status).toBe(404)
    Object.defineProperty(process.env, 'NODE_ENV', { value: orig, writable: true, configurable: true })
  })
})
