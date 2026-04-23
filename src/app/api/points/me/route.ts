import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  const repo = getRepository()
  return NextResponse.json({
    balance: repo.getPointBalance(auth.userId),
    history: repo.listPoints(auth.userId),
  })
}
