import { request } from '@playwright/test'

export async function resetServerState(baseURL: string): Promise<void> {
  const ctx = await request.newContext({ baseURL })
  const res = await ctx.post('/api/__test/reset', {
    headers: { origin: baseURL, host: new URL(baseURL).host },
  })
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`)
  await ctx.dispose()
}
