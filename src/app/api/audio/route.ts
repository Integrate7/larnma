import { type NextRequest, NextResponse } from 'next/server'
import { publishTo } from '@/services/eventBus'
import { getGeminiAdapter } from '@/services/gemini'
import { requireDevice } from '@/services/guards'
import { fanOutEvent } from '@/services/notifications'
import { getRepository } from '@/services/repository'
import { MENU_CATALOG } from '@/services/menu'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireDevice(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'elder')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  // Parse multipart or JSON. For MVP, accept form-data or JSON body with a hintKeyword.
  let hintKeyword = ''
  let audio: Blob | undefined
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const body = (await req.json()) as { hintKeyword?: string }
      hintKeyword = body.hintKeyword ?? ''
    } catch {
      // ignore; fall through to empty transcript
    }
  } else {
    try {
      const form = await req.formData()
      hintKeyword = (form.get('fakeKeyword') as string | null) ?? ''
      const audioEntry = form.get('audio')
      if (audioEntry instanceof Blob) audio = audioEntry
    } catch {
      // ignore; fall through
    }
  }

  const analysis = await getGeminiAdapter().analyze({
    hintKeyword,
    audio,
  })

  const repo = getRepository()

  let entities = analysis.entities
  if (analysis.intent === 'HUNGRY') {
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
    const safe = annotated.filter((i) => i.isSafe).slice(0, 3)
    // Include items that only have allergy mismatch (not health condition) so caregiver can confirm
    const allergyOnly = annotated
      .filter((i) => !i.isSafe && i.allergyMatch.length > 0 && i.conditionMatch.length === 0)
      .slice(0, 2)
    const menuSuggestions = [...safe, ...allergyOnly]
    entities = { ...entities, menuSuggestions }
  }

  const event = repo.createAudioEvent({
    elderId: auth.elderId,
    transcript: analysis.transcript,
    mood: analysis.mood,
    intent: analysis.intent,
    confidence: analysis.confidence,
    summary: analysis.summary,
    entities,
  })

  // Fan-out notifications + publish to SSE bus
  const notis = fanOutEvent(event)
  const caregiverIds = Array.from(
    new Set(repo.listPairingsByElder(auth.elderId).map((p) => p.caregiverId)),
  )
  for (const cid of caregiverIds) {
    publishTo(cid, { kind: 'audio', event })
  }
  for (const n of notis) {
    publishTo(n.caregiverId, { kind: 'notification', notification: n })
  }

  return NextResponse.json({
    eventId: event.id,
    transcript: analysis.transcript,
    mood: analysis.mood,
    intent: analysis.intent,
    summary: analysis.summary,
    advice: analysis.advice,
  })
}
