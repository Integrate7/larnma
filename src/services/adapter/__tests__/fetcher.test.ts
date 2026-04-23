import { z } from 'zod'
import { fetcher } from '../fetcher'

const schema = z.object({ ok: z.boolean(), value: z.string() })

describe('fetcher', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns parsed data on success', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, value: 'hello' }),
    })

    const result = await fetcher('/api/test', schema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.value).toBe('hello')
    }
  })

  it('returns failure with body error on non-2xx', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'bad', errorCode: 'X' }),
    })

    const result = await fetcher('/api/test', schema)
    expect(result.success).toBe(false)
    expect(result.error).toBe('bad')
    expect(result.errorCode).toBe('X')
  })

  it('returns failure with HTTP code when body has no error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    const result = await fetcher('/api/test', schema)
    expect(result.success).toBe(false)
    expect(result.error).toBe('HTTP 500')
  })

  it('returns failure on schema mismatch', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }), // missing value
    })

    const result = await fetcher('/api/test', schema)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('SCHEMA_MISMATCH')
  })

  it('returns failure on network error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('boom'))
    const result = await fetcher('/api/test', schema)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('NETWORK')
    expect(result.error).toBe('boom')
  })

  it('sends POST body as JSON', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true, value: 'x' }),
    })
    await fetcher('/api/x', schema, {
      method: 'POST',
      body: { a: 1 },
      headers: { 'X-Custom': '1' },
    })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ a: 1 }),
      }),
    )
  })

  it('handles invalid JSON gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    })
    const result = await fetcher('/api/x', schema)
    expect(result.success).toBe(false)
    expect(result.error).toBe('HTTP 502')
  })
})
