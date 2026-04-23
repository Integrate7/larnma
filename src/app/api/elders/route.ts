import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createElderBodySchema } from '@/services/adapter/schemas/elder'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: z.infer<typeof createElderBodySchema>
  try {
    body = createElderBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const repo = getRepository()
  const elder = repo.createUser({
    role: 'elder',
    phone: body.basic.phone,
    name: body.basic.name,
    profilePicUrl: body.basic.profilePicUrl,
  })

  repo.createElderProfile({
    userId: elder.id,
    birthdate: body.basic.birthdate,
    addressLine: body.basic.addressLine,
    district: body.basic.district,
    province: body.basic.province,
    postalCode: body.basic.postalCode,
    conditions: body.health.conditions,
    symptoms: body.health.symptoms,
    medications: body.health.medications,
    allergies: body.health.allergies,
    foodPreferences: body.optional?.foodPreferences ?? [],
    foodDislikes: body.optional?.foodDislikes ?? [],
    bloodType: body.optional?.bloodType,
    heightCm: body.optional?.heightCm,
    weightKg: body.optional?.weightKg,
    hospitalContact: body.emergency.hospitalContact,
    doctorContact: body.emergency.doctorContact,
    backupRelative: body.emergency.backupRelative,
  })

  repo.createPairing({
    elderId: elder.id,
    caregiverId: auth.userId,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })

  return NextResponse.json({ id: elder.id }, { status: 201 })
}
