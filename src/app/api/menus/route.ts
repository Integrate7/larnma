import { NextResponse, type NextRequest } from 'next/server'
import { recommendMenus } from '@/services/menu'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const elderId = searchParams.get('elderId')
  const repo = getRepository()
  const profile = elderId ? repo.getElderProfile(elderId) : undefined
  const items = recommendMenus({
    conditions: profile?.conditions,
    allergies: profile?.allergies,
    dislikes: profile?.foodDislikes,
    limit: 3,
  })
  return NextResponse.json({ items })
}
