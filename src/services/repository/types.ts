import type {
  AudioEvent,
  Consent,
  DeviceSession,
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

export type IRepository = {
  // Users
  createUser: (user: Omit<User, 'id' | 'createdAt'>) => User
  getUserById: (id: string) => User | undefined
  getUserByPhone: (phone: string) => User | undefined
  getUserByEmail: (email: string) => User | undefined
  getUserByGoogleId: (googleId: string) => User | undefined
  updateUser: (id: string, patch: Partial<User>) => User | undefined

  // Elder profiles
  createElderProfile: (profile: ElderProfile) => ElderProfile
  getElderProfile: (userId: string) => ElderProfile | undefined
  updateElderProfile: (
    userId: string,
    patch: Partial<ElderProfile>,
  ) => ElderProfile | undefined

  // OTP
  createOtpChallenge: (
    challenge: Omit<OtpChallenge, 'id'>,
  ) => OtpChallenge
  getOtpChallengeByRef: (ref: string) => OtpChallenge | undefined
  latestOtpChallengeByPhone: (phone: string) => OtpChallenge | undefined
  updateOtpChallenge: (
    id: string,
    patch: Partial<OtpChallenge>,
  ) => OtpChallenge | undefined
  otpAttemptsInWindow: (phone: string, windowMs: number) => number

  // Sessions
  createSession: (s: Omit<Session, 'id' | 'createdAt' | 'lastSeen'>) => Session
  getSessionById: (id: string) => Session | undefined
  revokeSession: (id: string) => void

  // Device sessions (Elder)
  createDeviceSession: (
    s: Omit<DeviceSession, 'id' | 'createdAt' | 'lastSeen'>,
  ) => DeviceSession
  getDeviceSessionById: (id: string) => DeviceSession | undefined
  revokeDeviceSession: (id: string) => void

  // Pairings
  createPairing: (p: Omit<Pairing, 'id' | 'createdAt'>) => Pairing
  getPairing: (id: string) => Pairing | undefined
  listPairingsByElder: (elderId: string) => Pairing[]
  listPairingsByCaregiver: (caregiverId: string) => Pairing[]
  getPairingByPair: (
    elderId: string,
    caregiverId: string,
  ) => Pairing | undefined
  updatePairing: (id: string, patch: Partial<Pairing>) => Pairing | undefined

  // Invites
  createInvite: (inv: Omit<Invite, 'id'>) => Invite
  getInviteByTokenHash: (tokenHash: string) => Invite | undefined
  updateInvite: (id: string, patch: Partial<Invite>) => Invite | undefined

  // Audio events
  createAudioEvent: (e: Omit<AudioEvent, 'id' | 'createdAt'>) => AudioEvent
  listAudioEventsByElder: (elderId: string, limit?: number) => AudioEvent[]

  // Notifications
  createNotification: (
    n: Omit<Notification, 'id' | 'createdAt'>,
  ) => Notification
  getNotificationById: (id: string) => Notification | undefined
  listNotificationsByCaregiver: (
    caregiverId: string,
    limit?: number,
  ) => Notification[]
  updateNotification: (
    id: string,
    patch: Partial<Notification>,
  ) => Notification | undefined
  lockNotification: (
    id: string,
    caregiverId: string,
  ) => { locked: boolean; notification?: Notification }

  // Orders
  createOrder: (
    o: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Order
  getOrderById: (id: string) => Order | undefined
  updateOrder: (id: string, patch: Partial<Order>) => Order | undefined
  listOrdersByElder: (elderId: string) => Order[]
  listOrdersInFlight: (elderId: string) => Order[]

  // Points
  appendPoint: (
    caregiverId: string,
    delta: number,
    reason: string,
  ) => PointEntry
  getPointBalance: (caregiverId: string) => number
  listPoints: (caregiverId: string) => PointEntry[]

  // Consent
  recordConsent: (c: Omit<Consent, 'id'>) => Consent
  listConsents: (userId: string) => Consent[]

  // Admin
  reset: () => void
}
