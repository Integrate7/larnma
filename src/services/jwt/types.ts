export type JwtPayloadBase = {
  sub: string
  jti: string
  iat: number
  exp: number
  iss: string
}

export type CaregiverAccessPayload = JwtPayloadBase & {
  kind: 'access'
  role: 'caregiver'
}

export type CaregiverRefreshPayload = JwtPayloadBase & {
  kind: 'refresh'
  role: 'caregiver'
  sessionId: string
}

export type DeviceSessionPayload = JwtPayloadBase & {
  kind: 'device'
  role: 'elder'
  elderId: string
  fingerprint: string
}

export type PairingTokenPayload = JwtPayloadBase & {
  kind: 'pairing'
  elderId: string
  caregiverId: string
}

export type InviteTokenPayload = JwtPayloadBase & {
  kind: 'invite'
  elderId: string
  inviterId: string
}
