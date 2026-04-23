import { NextResponse, type NextRequest } from 'next/server'
import { requireDevice } from '@/services/guards'
import { getRepository } from '@/services/repository'
import { MENU_CATALOG } from '@/services/menu'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireDevice(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'elder')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const repo = getRepository()
  const profile = repo.getElderProfile(auth.elderId)
  const conditions = new Set(profile?.conditions ?? [])
  const allergies = new Set(profile?.allergies ?? [])
  const dislikes = new Set(profile?.foodDislikes ?? [])

  const annotated = MENU_CATALOG.map((item) => {
    const allergyMatch = item.allergensContained.filter((a) => allergies.has(a))
    const conditionMatch = item.conditionsExcluded.filter((c) => conditions.has(c))
    const isSafe = allergyMatch.length === 0 && conditionMatch.length === 0 && !dislikes.has(item.name)
    return { ...item, allergyMatch, conditionMatch, isSafe }
  })

  // safe items first (max 3), then allergenic items (for warning display)
  const safe = annotated.filter((i) => i.isSafe).slice(0, 3)
  const unsafe = annotated.filter((i) => !i.isSafe)
  const safeIds = new Set(safe.map((i) => i.id))

  // for each unsafe item, suggest first safe alternative
  const safeAlternatives = annotated.filter((i) => i.isSafe)
  const unsafeWithSuggestion = unsafe.map((item, idx) => ({
    ...item,
    suggestedAlternative: safeAlternatives[idx % safeAlternatives.length]?.name ?? null,
  }))

  const items = [
    ...safe.map((i) => ({ ...i, suggestedAlternative: null })),
    ...unsafeWithSuggestion.filter((i) => !safeIds.has(i.id)),
  ]

  return NextResponse.json({ items })
}
