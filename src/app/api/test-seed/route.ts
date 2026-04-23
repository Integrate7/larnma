import { NextResponse, type NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { __setGeminiAdapter, createMockGeminiAdapter } from '@/services/gemini'
import { resetEventBus } from '@/services/eventBus'
import { issueCaregiverSession, issueDeviceSession } from '@/services/auth'
import { COOKIES, setSessionCookie } from '@/services/jwt'
import { ADAPTER_CONFIG } from '@/services/adapter/config'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types/permission'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // reset to clean state
  __setRepository(createInMemoryRepository())
  __setGeminiAdapter(createMockGeminiAdapter())
  resetEventBus()

  const repo = getRepository()

  // caregiver
  const caregiver = repo.createUser({ role: 'caregiver', phone: '0800000001', name: 'ทดสอบ หลาน' })
  const cgSession = await issueCaregiverSession({ userId: caregiver.id })

  // elder
  const elderUser = repo.createUser({ role: 'elder', phone: '0800000002', name: 'ทดสอบ ยาย' })
  repo.createElderProfile({
    userId: elderUser.id,
    birthdate: '1950-01-01',
    addressLine: '123 ถนนทดสอบ',
    district: 'บางรัก',
    province: 'กรุงเทพมหานคร',
    postalCode: '10500',
    conditions: ['เบาหวาน'],
    symptoms: [],
    medications: [],
    allergies: ['กุ้ง', 'หมู'],
    foodPreferences: ['ข้าวต้ม'],
    foodDislikes: [],
  })

  // pairing
  repo.createPairing({
    elderId: elderUser.id,
    caregiverId: caregiver.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })

  // device session for elder
  const deviceSession = await issueDeviceSession({
    elderId: elderUser.id,
    fingerprint: 'test-device-seed',
  })

  const res = NextResponse.json({
    ok: true,
    caregiver: { id: caregiver.id, phone: '0800000001', name: 'ทดสอบ หลาน' },
    elder: {
      id: elderUser.id,
      phone: '0800000002',
      name: 'ทดสอบ ยาย',
      allergies: ['กุ้ง', 'หมู'],
      conditions: ['เบาหวาน'],
    },
  })

  setSessionCookie(res, COOKIES.access, cgSession.accessToken, {
    maxAgeSec: ADAPTER_CONFIG.accessTtlSec,
  })
  setSessionCookie(res, COOKIES.refresh, cgSession.refreshToken, {
    maxAgeSec: ADAPTER_CONFIG.refreshTtlSec,
  })
  setSessionCookie(res, COOKIES.device, deviceSession.token, {
    maxAgeSec: ADAPTER_CONFIG.deviceTtlSec,
  })

  return res
}
