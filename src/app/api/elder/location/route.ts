import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireDevice } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireDevice(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const repo = getRepository()
  const location = repo.setElderLocation({
    elderId: auth.elderId,
    lat: body.lat,
    lng: body.lng,
    accuracy: body.accuracy,
    capturedAt: new Date().toISOString(),
  })

  return NextResponse.json({ elderId: location.elderId, capturedAt: location.capturedAt })
}
