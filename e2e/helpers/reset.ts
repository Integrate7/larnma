import { request } from '@playwright/test'

export async function resetServerState(baseURL: string): Promise<void> {
  const ctx = await request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL, host: new URL(baseURL).host },
  })
  const res = await ctx.post('/api/test-reset')
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`)
  await ctx.dispose()
}
