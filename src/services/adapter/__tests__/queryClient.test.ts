import { createQueryClient } from '../queryClient'

describe('createQueryClient', () => {
  it('returns a QueryClient with no-focus refetch and retry=1', () => {
    const qc = createQueryClient()
    const opts = qc.getDefaultOptions()
    expect(opts.queries?.retry).toBe(1)
    expect(opts.queries?.refetchOnWindowFocus).toBe(false)
    expect(opts.mutations?.retry).toBe(0)
  })
})
