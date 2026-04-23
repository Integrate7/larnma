import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { updateElderSectionBodySchema } from '@/services/adapter/schemas/elder'
import {
  checkOriginAllowed,
  checkPermission,
  requireCaregiver,
} from '@/services/guards'
import { getRepository } from '@/services/repository'
import type { ElderProfile } from '@/shared/types'

export const runtime = 'nodejs'

function elderToResponse(
  id: string,
  user: { name: string; phone: string; profilePicUrl?: string },
  p: ElderProfile,
) {
  return {
    id,
    name: user.name,
    phone: user.phone,
    profilePicUrl: user.profilePicUrl,
    birthdate: p.birthdate,
    addressLine: p.addressLine,
    district: p.district,
    province: p.province,
    postalCode: p.postalCode,
    bloodType: p.bloodType,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    conditions: p.conditions,
    symptoms: p.symptoms,
    medications: p.medications,
    allergies: p.allergies,
    foodPreferences: p.foodPreferences,
    foodDislikes: p.foodDislikes,
    hospitalContact: p.hospitalContact,
    doctorContact: p.doctorContact,
    backupRelative: p.backupRelative,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  const repo = getRepository()
  const pairing = repo.getPairingByPair(id, auth.userId)
  if (!pairing?.permissions.view_dashboard) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  const user = repo.getUserById(id)
  const profile = repo.getElderProfile(id)
  if (!user || !profile)
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json(elderToResponse(id, user, profile))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const { id } = await params
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (
    !checkPermission({
      caregiverId: auth.userId,
      elderId: id,
      required: 'edit_elder_profile',
    })
  ) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let body: z.infer<typeof updateElderSectionBodySchema>
  try {
    body = updateElderSectionBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const repo = getRepository()
  if (body.section === 'basic' && 'name' in body.fields) {
    repo.updateUser(id, { name: String(body.fields.name) })
  }
  if (body.section === 'basic' && 'phone' in body.fields) {
    repo.updateUser(id, { phone: String(body.fields.phone) })
  }

  const profile = repo.updateElderProfile(id, body.fields as Partial<ElderProfile>)
  const user = repo.getUserById(id)
  if (!profile || !user)
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json(elderToResponse(id, user, profile))
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })
  const { id } = await params
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  const repo = getRepository()
  const pairing = repo.getPairingByPair(id, auth.userId)
  if (!pairing?.isPrimary)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const now = new Date()
  const hardDelete = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const profile = repo.updateElderProfile(id, {
    deletedAt: now.toISOString(),
    hardDeleteAfter: hardDelete.toISOString(),
  })
  if (!profile) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({
    deletedAt: profile.deletedAt,
    hardDeleteAfter: profile.hardDeleteAfter,
  })
}
