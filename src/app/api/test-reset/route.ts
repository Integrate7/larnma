import { NextResponse, type NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
} from '@/services/repository'
import { __setGeminiAdapter, createMockGeminiAdapter } from '@/services/gemini'
import { resetEventBus } from '@/services/eventBus'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  __setRepository(createInMemoryRepository())
  __setGeminiAdapter(createMockGeminiAdapter())
  resetEventBus()
  return NextResponse.json({ ok: true })
}
