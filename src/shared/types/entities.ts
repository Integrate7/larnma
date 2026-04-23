import type { Mood, Priority } from './mood'
import type { Intent } from './intent'
import type { Permissions } from './permission'
import type { Role } from './role'

export type User = {
  id: string
  role: Role
  phone: string
  name: string
  profilePicUrl?: string
  createdAt: string
}

export type Medication = {
  name: string
  dosage: string
  time: string
}

export type Contact = {
  name: string
  phone: string
  specialty?: string
  relation?: string
}

export type ElderProfile = {
  userId: string
  birthdate?: string
  addressLine: string
  district: string
  province: string
  postalCode: string
  bloodType?: string
  heightCm?: number
  weightKg?: number
  conditions: string[]
  symptoms: string[]
  medications: Medication[]
  allergies: string[]
  foodPreferences: string[]
  foodDislikes: string[]
  hospitalContact?: Contact
  doctorContact?: Contact
  backupRelative?: Contact
  deletedAt?: string
  hardDeleteAfter?: string
}

export type Pairing = {
  id: string
  elderId: string
  caregiverId: string
  isPrimary: boolean
  permissions: Permissions
  primaryTransferredAt?: string
  createdAt: string
  revokedAt?: string
}

export type OtpChallenge = {
  id: string
  phone: string
  codeHash: string
  ref: string
  attempts: number
  expiresAt: string
  consumedAt?: string
  lockedUntil?: string
}

export type Session = {
  id: string
  userId: string
  refreshHash: string
  userAgent?: string
  ip?: string
  lastSeen: string
  revokedAt?: string
  createdAt: string
}

export type DeviceSession = {
  id: string
  elderId: string
  deviceFingerprint: string
  refreshHash: string
  lastSeen: string
  revokedAt?: string
  createdAt: string
}

export type AudioEvent = {
  id: string
  elderId: string
  transcript: string
  mood: Mood
  intent: Intent
  confidence: number
  summary: string
  entities: Record<string, unknown>
  createdAt: string
}

export type Notification = {
  id: string
  eventId: string
  caregiverId: string
  priority: Priority
  readAt?: string
  ackAt?: string
  lockedByCaregiverId?: string
  escalated?: boolean
  createdAt: string
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

export type OrderItem = {
  name: string
  price: number
  qty: number
}

export type Order = {
  id: string
  eventId: string
  caregiverId: string
  elderId: string
  menu: OrderItem[]
  total: number
  status: OrderStatus
  mockRef: string
  createdAt: string
  updatedAt: string
}

export type PointEntry = {
  id: string
  caregiverId: string
  delta: number
  reason: string
  balanceAfter: number
  createdAt: string
}

export type ConsentType = 'audio_ai' | 'health_data' | 'marketing'

export type Consent = {
  id: string
  userId: string
  type: ConsentType
  grantedAt?: string
  revokedAt?: string
}

export type Invite = {
  id: string
  elderId: string
  createdByCaregiverId: string
  tokenHash: string
  expiresAt: string
  acceptedByCaregiverId?: string
  acceptedAt?: string
}
