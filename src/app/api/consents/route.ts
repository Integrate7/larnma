import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { consentBodySchema } from '@/services/adapter/schemas/consent'
import { checkOriginAllowed, requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkOriginAllowed(req))
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 })

  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  let body: z.infer<typeof consentBodySchema>
  try {
    body = consentBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }
  const required = ['audio_ai', 'health_data'] as const
  for (const t of required) {
    const item = body.items.find((i) => i.type === t)
    if (!item?.granted) {
      return NextResponse.json(
        { error: 'CONSENT_REQUIRED', errorCode: t },
        { status: 400 },
      )
    }
  }

  const repo = getRepository()
  const now = new Date().toISOString()
  const records = body.items.map((i) =>
    repo.recordConsent({
      userId: auth.userId,
      type: i.type,
      grantedAt: i.granted ? now : undefined,
      revokedAt: i.granted ? undefined : now,
    }),
  )
  return NextResponse.json({ count: records.length })
}
