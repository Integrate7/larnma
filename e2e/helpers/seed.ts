import type { APIRequestContext, BrowserContext } from '@playwright/test'
import { request } from '@playwright/test'

const MOCK_OTP = '123456'

export type SeedContext = {
  baseURL: string
  api: APIRequestContext
}

export async function makeSeedContext(baseURL: string): Promise<SeedContext> {
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL, host: new URL(baseURL).host },
  })
  return { baseURL, api }
}

export async function resetServer(ctx: SeedContext): Promise<void> {
  const res = await ctx.api.post('/api/test-reset')
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`)
}

export async function loginCaregiver(
  ctx: SeedContext,
  phone: string,
): Promise<void> {
  const send = await ctx.api.post('/api/auth/otp/send', { data: { phone } })
  if (!send.ok()) throw new Error(`otp send failed: ${send.status()}`)
  const { ref } = await send.json()
  const verify = await ctx.api.post('/api/auth/otp/verify', {
    data: { phone, code: MOCK_OTP, ref },
  })
  if (!verify.ok()) throw new Error(`otp verify failed: ${verify.status()}`)
}

export async function setCaregiverName(
  ctx: SeedContext,
  name: string,
): Promise<void> {
  const res = await ctx.api.patch('/api/caregivers/me', { data: { name } })
  if (!res.ok()) throw new Error(`set name failed: ${res.status()}`)
}

export async function grantDefaultConsents(ctx: SeedContext): Promise<void> {
  const res = await ctx.api.post('/api/consents', {
    data: {
      items: [
        { type: 'audio_ai', granted: true },
        { type: 'health_data', granted: true },
        { type: 'marketing', granted: false },
      ],
    },
  })
  if (!res.ok()) throw new Error(`consent failed: ${res.status()}`)
}

export type ElderInput = {
  name: string
  phone: string
  addressLine?: string
  district?: string
  province?: string
  postalCode?: string
  conditions?: string[]
  allergies?: string[]
}

export async function createElder(
  ctx: SeedContext,
  input: ElderInput,
): Promise<string> {
  const res = await ctx.api.post('/api/elders', {
    data: {
      basic: {
        name: input.name,
        phone: input.phone,
        addressLine: input.addressLine ?? 'บ้านเลขที่ 1',
        district: input.district ?? 'เมือง',
        province: input.province ?? 'กทม',
        postalCode: input.postalCode ?? '10100',
      },
      health: {
        conditions: input.conditions ?? [],
        symptoms: [],
        medications: [],
        allergies: input.allergies ?? [],
      },
      emergency: {},
      optional: { foodPreferences: [], foodDislikes: [] },
    },
  })
  if (!res.ok()) throw new Error(`create elder failed: ${res.status()}`)
  const { id } = await res.json()
  return id as string
}

export async function createPairingQr(
  ctx: SeedContext,
  elderId: string,
): Promise<{ token: string; exp: string }> {
  const res = await ctx.api.post('/api/pairings/qr', {
    data: { elderId },
  })
  if (!res.ok()) throw new Error(`pairing qr failed: ${res.status()}`)
  const { token, exp } = await res.json()
  return { token, exp }
}

export async function consumePairingWithContext(
  context: BrowserContext,
  baseURL: string,
  token: string,
): Promise<string> {
  const res = await context.request.post('/api/pairings/consume', {
    data: { token, deviceFingerprint: 'e2e-fp-1' },
    headers: { origin: baseURL, host: new URL(baseURL).host },
  })
  if (!res.ok()) throw new Error(`consume failed: ${res.status()}`)
  const { elderId } = await res.json()
  return elderId
}

export async function sendAudio(
  ctx: APIRequestContext,
  baseURL: string,
  keyword: string,
): Promise<{ mood: string; eventId: string }> {
  const res = await ctx.post('/api/audio', {
    data: { hintKeyword: keyword },
    headers: {
      origin: baseURL,
      host: new URL(baseURL).host,
      'content-type': 'application/json',
    },
  })
  if (!res.ok()) throw new Error(`audio failed: ${res.status()}`)
  return res.json()
}

export async function createInvite(
  ctx: SeedContext,
  elderId: string,
): Promise<{ token: string; url: string }> {
  const res = await ctx.api.post('/api/invites', { data: { elderId } })
  if (!res.ok()) throw new Error(`invite failed: ${res.status()}`)
  const { token, url } = await res.json()
  return { token, url }
}

export async function copyCookies(
  source: APIRequestContext,
  target: BrowserContext,
  baseURL: string,
): Promise<void> {
  const storage = await source.storageState()
  const url = new URL(baseURL)
  const cookies = storage.cookies.map((c) => ({
    ...c,
    domain: c.domain || url.hostname,
  }))
  await target.addCookies(cookies)
}

export type PrimaryFixture = {
  caregiverPhone: string
  elderPhone: string
  elderId: string
  pairingToken: string
}

export async function seedPrimaryAndElder(
  baseURL: string,
  overrides: Partial<ElderInput> = {},
): Promise<{ ctx: SeedContext; fixture: PrimaryFixture }> {
  const ctx = await makeSeedContext(baseURL)
  await resetServer(ctx)
  const caregiverPhone = '0812345001'
  await loginCaregiver(ctx, caregiverPhone)
  await setCaregiverName(ctx, 'คุณลูก')
  await grantDefaultConsents(ctx)
  const elderPhone = '0899999001'
  const elderId = await createElder(ctx, {
    name: overrides.name ?? 'ย่าสมร',
    phone: overrides.phone ?? elderPhone,
    addressLine: overrides.addressLine,
    district: overrides.district,
    province: overrides.province,
    postalCode: overrides.postalCode,
    conditions: overrides.conditions,
    allergies: overrides.allergies,
  })
  const { token } = await createPairingQr(ctx, elderId)
  return {
    ctx,
    fixture: {
      caregiverPhone,
      elderPhone,
      elderId,
      pairingToken: token,
    },
  }
}
