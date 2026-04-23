import { v4 as uuid } from 'uuid'
import type {
  AudioEvent,
  Consent,
  DeviceSession,
  ElderLocation,
  ElderProfile,
  Invite,
  Notification,
  Order,
  OtpChallenge,
  Pairing,
  PointEntry,
  Session,
  User,
} from '@/shared/types'
import type { IRepository } from './types'

type State = {
  users: Map<string, User>
  userByPhone: Map<string, string>
  elderProfiles: Map<string, ElderProfile>
  otpChallenges: Map<string, OtpChallenge>
  sessions: Map<string, Session>
  deviceSessions: Map<string, DeviceSession>
  pairings: Map<string, Pairing>
  invites: Map<string, Invite>
  audioEvents: Map<string, AudioEvent>
  notifications: Map<string, Notification>
  orders: Map<string, Order>
  points: Map<string, PointEntry[]>
  elderLocations: Map<string, ElderLocation>
}

const makeState = (): State => ({
  users: new Map(),
  userByPhone: new Map(),
  elderProfiles: new Map(),
  otpChallenges: new Map(),
  sessions: new Map(),
  deviceSessions: new Map(),
  pairings: new Map(),
  invites: new Map(),
  audioEvents: new Map(),
  notifications: new Map(),
  orders: new Map(),
  points: new Map(),
  elderLocations: new Map(),
})

export function createInMemoryRepository(): IRepository {
  let state = makeState()
  const consents: Consent[] = []

  const now = () => new Date().toISOString()

  return {
    createUser(u) {
      const user: User = {
        ...u,
        id: uuid(),
        createdAt: now(),
      }
      state.users.set(user.id, user)
      state.userByPhone.set(user.phone, user.id)
      return user
    },
    getUserById(id) {
      return state.users.get(id)
    },
    getUserByPhone(phone) {
      const id = state.userByPhone.get(phone)
      return id ? state.users.get(id) : undefined
    },
    updateUser(id, patch) {
      const existing = state.users.get(id)
      if (!existing) return undefined
      const merged: User = { ...existing, ...patch, id }
      state.users.set(id, merged)
      if (patch.phone && patch.phone !== existing.phone) {
        state.userByPhone.delete(existing.phone)
        state.userByPhone.set(merged.phone, id)
      }
      return merged
    },

    createElderProfile(p) {
      state.elderProfiles.set(p.userId, p)
      return p
    },
    getElderProfile(id) {
      return state.elderProfiles.get(id)
    },
    updateElderProfile(id, patch) {
      const e = state.elderProfiles.get(id)
      if (!e) return undefined
      const merged: ElderProfile = { ...e, ...patch, userId: id }
      state.elderProfiles.set(id, merged)
      return merged
    },

    createOtpChallenge(c) {
      const ch: OtpChallenge = { ...c, id: uuid() }
      state.otpChallenges.set(ch.id, ch)
      return ch
    },
    getOtpChallengeByRef(ref) {
      for (const c of state.otpChallenges.values()) {
        if (c.ref === ref) return c
      }
      return undefined
    },
    latestOtpChallengeByPhone(phone) {
      let latest: OtpChallenge | undefined
      for (const c of state.otpChallenges.values()) {
        if (c.phone !== phone) continue
        if (!latest || c.expiresAt > latest.expiresAt) latest = c
      }
      return latest
    },
    updateOtpChallenge(id, patch) {
      const c = state.otpChallenges.get(id)
      if (!c) return undefined
      const merged: OtpChallenge = { ...c, ...patch, id }
      state.otpChallenges.set(id, merged)
      return merged
    },
    otpAttemptsInWindow(phone, windowMs) {
      const cutoff = Date.now() - windowMs
      let n = 0
      for (const c of state.otpChallenges.values()) {
        if (c.phone !== phone) continue
        if (new Date(c.expiresAt).getTime() < cutoff) continue
        n += 1
      }
      return n
    },

    createSession(s) {
      const session: Session = {
        ...s,
        id: uuid(),
        createdAt: now(),
        lastSeen: now(),
      }
      state.sessions.set(session.id, session)
      return session
    },
    getSessionById(id) {
      return state.sessions.get(id)
    },
    revokeSession(id) {
      const s = state.sessions.get(id)
      if (s) state.sessions.set(id, { ...s, revokedAt: now() })
    },

    createDeviceSession(s) {
      const session: DeviceSession = {
        ...s,
        id: uuid(),
        createdAt: now(),
        lastSeen: now(),
      }
      state.deviceSessions.set(session.id, session)
      return session
    },
    getDeviceSessionById(id) {
      return state.deviceSessions.get(id)
    },
    revokeDeviceSession(id) {
      const s = state.deviceSessions.get(id)
      if (s) state.deviceSessions.set(id, { ...s, revokedAt: now() })
    },

    createPairing(p) {
      const pairing: Pairing = { ...p, id: uuid(), createdAt: now() }
      state.pairings.set(pairing.id, pairing)
      return pairing
    },
    getPairing(id) {
      return state.pairings.get(id)
    },
    listPairingsByElder(elderId) {
      return Array.from(state.pairings.values()).filter(
        (p) => p.elderId === elderId && !p.revokedAt,
      )
    },
    listPairingsByCaregiver(caregiverId) {
      return Array.from(state.pairings.values()).filter(
        (p) => p.caregiverId === caregiverId && !p.revokedAt,
      )
    },
    getPairingByPair(elderId, caregiverId) {
      return Array.from(state.pairings.values()).find(
        (p) =>
          p.elderId === elderId &&
          p.caregiverId === caregiverId &&
          !p.revokedAt,
      )
    },
    updatePairing(id, patch) {
      const p = state.pairings.get(id)
      if (!p) return undefined
      const merged: Pairing = { ...p, ...patch, id }
      state.pairings.set(id, merged)
      return merged
    },

    createInvite(inv) {
      const invite: Invite = { ...inv, id: uuid() }
      state.invites.set(invite.id, invite)
      return invite
    },
    getInviteByTokenHash(h) {
      for (const i of state.invites.values()) {
        if (i.tokenHash === h) return i
      }
      return undefined
    },
    updateInvite(id, patch) {
      const i = state.invites.get(id)
      if (!i) return undefined
      const merged: Invite = { ...i, ...patch, id }
      state.invites.set(id, merged)
      return merged
    },

    createAudioEvent(e) {
      const ev: AudioEvent = { ...e, id: uuid(), createdAt: now() }
      state.audioEvents.set(ev.id, ev)
      return ev
    },
    listAudioEventsByElder(elderId, limit = 50) {
      return Array.from(state.audioEvents.values())
        .filter((e) => e.elderId === elderId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit)
    },

    createNotification(n) {
      const noti: Notification = { ...n, id: uuid(), createdAt: now() }
      state.notifications.set(noti.id, noti)
      return noti
    },
    getNotificationById(id) {
      return state.notifications.get(id)
    },
    listNotificationsByCaregiver(caregiverId, limit = 50) {
      return Array.from(state.notifications.values())
        .filter((n) => n.caregiverId === caregiverId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit)
    },
    updateNotification(id, patch) {
      const n = state.notifications.get(id)
      if (!n) return undefined
      const merged: Notification = { ...n, ...patch, id }
      state.notifications.set(id, merged)
      return merged
    },
    lockNotification(id, caregiverId) {
      const n = state.notifications.get(id)
      if (!n) return { locked: false }
      if (n.lockedByCaregiverId && n.lockedByCaregiverId !== caregiverId) {
        return { locked: false, notification: n }
      }
      if (n.lockedByCaregiverId === caregiverId) {
        return { locked: true, notification: n }
      }
      const updated: Notification = {
        ...n,
        lockedByCaregiverId: caregiverId,
        ackAt: now(),
      }
      state.notifications.set(id, updated)
      return { locked: true, notification: updated }
    },

    createOrder(o) {
      const order: Order = {
        ...o,
        id: uuid(),
        createdAt: now(),
        updatedAt: now(),
      }
      state.orders.set(order.id, order)
      return order
    },
    getOrderById(id) {
      return state.orders.get(id)
    },
    updateOrder(id, patch) {
      const o = state.orders.get(id)
      if (!o) return undefined
      const merged: Order = { ...o, ...patch, id, updatedAt: now() }
      state.orders.set(id, merged)
      return merged
    },
    listOrdersByElder(elderId) {
      return Array.from(state.orders.values()).filter(
        (o) => o.elderId === elderId,
      )
    },
    listOrdersInFlight(elderId) {
      return Array.from(state.orders.values()).filter(
        (o) =>
          o.elderId === elderId &&
          (o.status === 'preparing' || o.status === 'delivering'),
      )
    },

    appendPoint(caregiverId, delta, reason) {
      const prev = state.points.get(caregiverId) ?? []
      const balance = (prev[0]?.balanceAfter ?? 0) + delta
      const entry: PointEntry = {
        id: uuid(),
        caregiverId,
        delta,
        reason,
        balanceAfter: balance,
        createdAt: now(),
      }
      state.points.set(caregiverId, [entry, ...prev])
      return entry
    },
    getPointBalance(caregiverId) {
      return state.points.get(caregiverId)?.[0]?.balanceAfter ?? 0
    },
    listPoints(caregiverId) {
      return state.points.get(caregiverId) ?? []
    },

    recordConsent(c) {
      const consent: Consent = { ...c, id: uuid() }
      consents.push(consent)
      return consent
    },
    listConsents(userId) {
      return consents.filter((c) => c.userId === userId)
    },

    setElderLocation(loc) {
      state.elderLocations.set(loc.elderId, loc)
      return loc
    },
    getElderLocation(elderId) {
      return state.elderLocations.get(elderId)
    },

    reset() {
      state = makeState()
      consents.length = 0
    },
  }
}
