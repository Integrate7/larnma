import { z } from 'zod'
import type { ActionResult } from '@/shared/types'

export type FetcherOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export async function fetcher<T>(
  url: string,
  schema: z.ZodType<T>,
  opts: FetcherOptions = {},
): Promise<ActionResult<T>> {
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: opts.signal,
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        typeof json === 'object' && json && 'error' in json
          ? String((json as { error: unknown }).error)
          : `HTTP ${res.status}`
      const code =
        typeof json === 'object' && json && 'errorCode' in json
          ? String((json as { errorCode: unknown }).errorCode)
          : undefined
      return { success: false, data: null, error: message, errorCode: code }
    }

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: `Invalid response shape: ${parsed.error.message}`,
        errorCode: 'SCHEMA_MISMATCH',
      }
    }
    return { success: true, data: parsed.data, error: null }
  } catch (e) {
    return {
      success: false,
      data: null,
      error: e instanceof Error ? e.message : String(e),
      errorCode: 'NETWORK',
    }
  }
}
