import { NextResponse, type NextRequest } from 'next/server'
import { requireDevice } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireDevice(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'elder')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const repo = getRepository()
  const user = repo.getUserById(auth.elderId)
  const profile = repo.getElderProfile(auth.elderId)
  if (!user || !profile)
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  // Find primary caregiver for one-tap call
  const pairings = repo.listPairingsByElder(auth.elderId)
  const primary = pairings.find((p) => p.isPrimary)
  const primaryUser = primary ? repo.getUserById(primary.caregiverId) : undefined

  return NextResponse.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    profilePicUrl: user.profilePicUrl,
    birthdate: profile.birthdate,
    addressLine: profile.addressLine,
    district: profile.district,
    province: profile.province,
    postalCode: profile.postalCode,
    conditions: profile.conditions,
    medications: profile.medications,
    allergies: profile.allergies,
    primaryCaregiver: primaryUser
      ? { id: primaryUser.id, name: primaryUser.name, phone: primaryUser.phone }
      : undefined,
  })
}
