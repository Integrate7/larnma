/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { issueCaregiverSession, issueDeviceSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { __setRepository, createInMemoryRepository, getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS, DEFAULT_SECONDARY_PERMISSIONS } from '@/shared/types'
import { GET } from '../route'

function req(cookie?: string) {
  return new NextRequest('http://localhost:3000/api/pairings/me', {
    method: 'GET',
    headers: { host: 'localhost:3000', ...(cookie ? { cookie } : {}) },
  })
}

async function bootCaregiver() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า' })
  repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return { cookie: `${COOKIES.access}=${s.accessToken}`, cgId: cg.id, elderId: elder.id }
}

async function bootElderDevice() {
  const repo = getRepository()
  const elder = repo.createUser({ role: 'elder', phone: '0811', name: 'ย่า' })
  const s = await issueDeviceSession({ elderId: elder.id, fingerprint: 'fp' })
  return `${COOKIES.device}=${s.token}`
}

describe('GET /api/pairings/me', () => {
  beforeEach(() => { __setRepository(createInMemoryRepository()) })

  it('rejects unauthenticated', async () => {
    const r = await GET(req())
    expect(r.status).toBe(401)
  })

  it('rejects device session (requireCaregiver returns 401)', async () => {
    const cookie = await bootElderDevice()
    const r = await GET(req(cookie))
    expect(r.status).toBe(401)
  })

  it('returns empty array when caregiver has no pairings', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toEqual([])
  })

  it('returns pairings for caregiver, including elderName', async () => {
    const { cookie, elderId } = await bootCaregiver()
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      elderId,
      isPrimary: true,
      elderName: 'ย่า',
    })
    expect(typeof body[0].id).toBe('string')
  })

  it('falls back to null elderName when the elder user record is missing', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    repo.createPairing({
      elderId: 'ghost-elder-id',
      caregiverId: cg.id,
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toHaveLength(1)
    expect(body[0].elderName).toBeNull()
  })

  it('returns multiple pairings', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    const elder1 = repo.createUser({ role: 'elder', phone: '0822', name: 'ย่า1' })
    const elder2 = repo.createUser({ role: 'elder', phone: '0833', name: 'ย่า2' })
    repo.createPairing({ elderId: elder1.id, caregiverId: cg.id, isPrimary: true, permissions: DEFAULT_PRIMARY_PERMISSIONS })
    repo.createPairing({ elderId: elder2.id, caregiverId: cg.id, isPrimary: false, permissions: DEFAULT_SECONDARY_PERMISSIONS })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await GET(req(cookie))
    const body = await r.json()
    expect(body).toHaveLength(2)
  })

  it('includes elderName and elderPhone joined from the elder user', async () => {
    const { cookie, elderId } = await bootCaregiver()
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body[0]).toMatchObject({
      elderId,
      elderName: 'ย่า',
      elderPhone: '0822',
    })
  })

  it('returns null elderName/elderPhone when the elder user is missing', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    repo.createPairing({
      elderId: 'missing-elder-id',
      caregiverId: cg.id,
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await GET(req(cookie))
    const body = await r.json()
    expect(body[0].elderName).toBeNull()
    expect(body[0].elderPhone).toBeNull()
  })
})
