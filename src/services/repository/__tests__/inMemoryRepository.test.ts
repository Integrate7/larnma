import { createInMemoryRepository } from '../inMemoryRepository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'

describe('InMemoryRepository', () => {
  it('creates + retrieves users by id and phone', () => {
    const r = createInMemoryRepository()
    const u = r.createUser({ role: 'caregiver', phone: '0812345678', name: 'A' })
    expect(r.getUserById(u.id)).toEqual(u)
    expect(r.getUserByPhone('0812345678')).toEqual(u)
  })

  it('updates user and moves phone index', () => {
    const r = createInMemoryRepository()
    const u = r.createUser({ role: 'caregiver', phone: '0811', name: 'A' })
    const next = r.updateUser(u.id, { phone: '0822', name: 'B' })
    expect(next?.phone).toBe('0822')
    expect(r.getUserByPhone('0811')).toBeUndefined()
    expect(r.getUserByPhone('0822')?.id).toBe(u.id)
  })

  it('updateUser returns undefined for unknown id', () => {
    const r = createInMemoryRepository()
    expect(r.updateUser('x', { name: 'y' })).toBeUndefined()
  })

  it('creates + updates elder profile', () => {
    const r = createInMemoryRepository()
    r.createElderProfile({
      userId: 'e1',
      addressLine: 'home',
      district: '',
      province: '',
      postalCode: '',
      conditions: [],
      symptoms: [],
      medications: [],
      allergies: [],
      foodPreferences: [],
      foodDislikes: [],
    })
    const next = r.updateElderProfile('e1', { addressLine: 'new' })
    expect(next?.addressLine).toBe('new')
    expect(r.updateElderProfile('missing', {})).toBeUndefined()
  })

  it('tracks OTP attempts within a window and retrieves by ref + latest', () => {
    const r = createInMemoryRepository()
    const c1 = r.createOtpChallenge({
      phone: '0811',
      codeHash: 'h',
      ref: 'r1',
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    r.createOtpChallenge({
      phone: '0811',
      codeHash: 'h',
      ref: 'r2',
      attempts: 0,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    })
    expect(r.getOtpChallengeByRef('r1')?.id).toBe(c1.id)
    expect(r.getOtpChallengeByRef('nope')).toBeUndefined()
    expect(r.latestOtpChallengeByPhone('0811')?.ref).toBe('r2')
    expect(r.latestOtpChallengeByPhone('0822')).toBeUndefined()
    expect(r.otpAttemptsInWindow('0811', 600_000)).toBeGreaterThanOrEqual(2)
  })

  it('updates OTP challenge', () => {
    const r = createInMemoryRepository()
    const c = r.createOtpChallenge({
      phone: 'x',
      codeHash: 'h',
      ref: 'r',
      attempts: 0,
      expiresAt: new Date().toISOString(),
    })
    const next = r.updateOtpChallenge(c.id, { attempts: 2 })
    expect(next?.attempts).toBe(2)
    expect(r.updateOtpChallenge('x', {})).toBeUndefined()
  })

  it('sessions lifecycle', () => {
    const r = createInMemoryRepository()
    const s = r.createSession({
      userId: 'u',
      refreshHash: 'h',
    })
    expect(r.getSessionById(s.id)).toBeTruthy()
    r.revokeSession(s.id)
    expect(r.getSessionById(s.id)?.revokedAt).toBeTruthy()
    r.revokeSession('missing') // no-op
  })

  it('device sessions lifecycle', () => {
    const r = createInMemoryRepository()
    const s = r.createDeviceSession({
      elderId: 'e',
      deviceFingerprint: 'fp',
      refreshHash: 'h',
    })
    expect(r.getDeviceSessionById(s.id)).toBeTruthy()
    r.revokeDeviceSession(s.id)
    expect(r.getDeviceSessionById(s.id)?.revokedAt).toBeTruthy()
    r.revokeDeviceSession('missing')
  })

  it('pairings CRUD and queries', () => {
    const r = createInMemoryRepository()
    const p = r.createPairing({
      elderId: 'e1',
      caregiverId: 'c1',
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    expect(r.getPairing(p.id)?.isPrimary).toBe(true)
    expect(r.listPairingsByElder('e1')).toHaveLength(1)
    expect(r.listPairingsByCaregiver('c1')).toHaveLength(1)
    expect(r.getPairingByPair('e1', 'c1')?.id).toBe(p.id)
    const next = r.updatePairing(p.id, { isPrimary: false })
    expect(next?.isPrimary).toBe(false)
    expect(r.updatePairing('x', {})).toBeUndefined()
    // revoke → disappears from lists
    r.updatePairing(p.id, { revokedAt: new Date().toISOString() })
    expect(r.listPairingsByElder('e1')).toHaveLength(0)
    expect(r.listPairingsByCaregiver('c1')).toHaveLength(0)
    expect(r.getPairingByPair('e1', 'c1')).toBeUndefined()
  })

  it('invites', () => {
    const r = createInMemoryRepository()
    const inv = r.createInvite({
      elderId: 'e',
      createdByCaregiverId: 'c',
      tokenHash: 'H',
      expiresAt: new Date().toISOString(),
    })
    expect(r.getInviteByTokenHash('H')?.id).toBe(inv.id)
    expect(r.getInviteByTokenHash('nope')).toBeUndefined()
    expect(
      r.updateInvite(inv.id, { acceptedByCaregiverId: 'c2' })
        ?.acceptedByCaregiverId,
    ).toBe('c2')
    expect(r.updateInvite('missing', {})).toBeUndefined()
  })

  it('audio events sorted desc by createdAt', async () => {
    const r = createInMemoryRepository()
    r.createAudioEvent({
      elderId: 'e',
      transcript: 'a',
      mood: 'NORMAL',
      intent: 'CHAT',
      confidence: 0.9,
      summary: '',
      entities: {},
    })
    await new Promise((res) => setTimeout(res, 2))
    const e2 = r.createAudioEvent({
      elderId: 'e',
      transcript: 'b',
      mood: 'HUNGRY',
      intent: 'HUNGRY',
      confidence: 0.8,
      summary: '',
      entities: {},
    })
    const list = r.listAudioEventsByElder('e')
    expect(list[0].id).toBe(e2.id)
    expect(r.listAudioEventsByElder('e', 1)).toHaveLength(1)
  })

  it('notifications lifecycle + first-click-wins lock', () => {
    const r = createInMemoryRepository()
    const n = r.createNotification({
      eventId: 'ev',
      caregiverId: 'c1',
      priority: 'critical',
    })
    const first = r.lockNotification(n.id, 'c1')
    expect(first.locked).toBe(true)
    const again = r.lockNotification(n.id, 'c1')
    expect(again.locked).toBe(true)
    const other = r.lockNotification(n.id, 'c2')
    expect(other.locked).toBe(false)
    expect(other.notification?.lockedByCaregiverId).toBe('c1')
    expect(r.lockNotification('missing', 'c').locked).toBe(false)
    expect(r.updateNotification(n.id, { readAt: 'x' })?.readAt).toBe('x')
    expect(r.updateNotification('missing', {})).toBeUndefined()
    expect(r.listNotificationsByCaregiver('c1')).toHaveLength(1)
    expect(r.listNotificationsByCaregiver('c1', 0)).toHaveLength(0)
  })

  it('orders lifecycle + in-flight filter', () => {
    const r = createInMemoryRepository()
    const o = r.createOrder({
      eventId: 'ev',
      caregiverId: 'c',
      elderId: 'e',
      menu: [{ name: 'x', price: 10, qty: 1 }],
      total: 10,
      status: 'pending',
      mockRef: 'm',
    })
    expect(r.getOrderById(o.id)?.status).toBe('pending')
    r.updateOrder(o.id, { status: 'preparing' })
    expect(r.listOrdersInFlight('e')).toHaveLength(1)
    r.updateOrder(o.id, { status: 'delivered' })
    expect(r.listOrdersInFlight('e')).toHaveLength(0)
    expect(r.listOrdersByElder('e')).toHaveLength(1)
    expect(r.updateOrder('missing', {})).toBeUndefined()
  })

  it('points ledger and balance', () => {
    const r = createInMemoryRepository()
    expect(r.getPointBalance('c')).toBe(0)
    r.appendPoint('c', 10, 'order')
    r.appendPoint('c', 5, 'referral')
    expect(r.getPointBalance('c')).toBe(15)
    expect(r.listPoints('c')).toHaveLength(2)
    expect(r.listPoints('other')).toHaveLength(0)
  })

  it('consents and reset', () => {
    const r = createInMemoryRepository()
    r.recordConsent({ userId: 'u', type: 'audio_ai', grantedAt: 'x' })
    r.recordConsent({ userId: 'u2', type: 'health_data', grantedAt: 'x' })
    expect(r.listConsents('u')).toHaveLength(1)
    r.reset()
    expect(r.listConsents('u')).toHaveLength(0)
    expect(r.getUserByPhone('any')).toBeUndefined()
  })
})

describe('elder location', () => {
  let repo: ReturnType<typeof createInMemoryRepository>
  beforeEach(() => {
    repo = createInMemoryRepository()
  })

  it('returns undefined when no location set', () => {
    expect(repo.getElderLocation('unknown')).toBeUndefined()
  })

  it('stores and retrieves a location', () => {
    const loc = repo.setElderLocation({
      elderId: 'e1',
      lat: 13.7563,
      lng: 100.5018,
      capturedAt: '2026-04-23T10:00:00Z',
    })
    expect(repo.getElderLocation('e1')).toEqual(loc)
  })

  it('overwrites previous location for same elder', () => {
    repo.setElderLocation({
      elderId: 'e1',
      lat: 13.7,
      lng: 100.5,
      capturedAt: '2026-04-23T09:00:00Z',
    })
    repo.setElderLocation({
      elderId: 'e1',
      lat: 14.0,
      lng: 101.0,
      capturedAt: '2026-04-23T10:00:00Z',
    })
    expect(repo.getElderLocation('e1')?.lat).toBe(14.0)
  })

  it('clears on reset', () => {
    repo.setElderLocation({
      elderId: 'e1',
      lat: 13.7,
      lng: 100.5,
      capturedAt: '2026-04-23T10:00:00Z',
    })
    repo.reset()
    expect(repo.getElderLocation('e1')).toBeUndefined()
  })
})
