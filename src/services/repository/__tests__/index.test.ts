import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '../index'

describe('repository singleton', () => {
  it('returns the same instance across calls', () => {
    const a = getRepository()
    const b = getRepository()
    expect(a).toBe(b)
  })

  it('__setRepository swaps the instance (for tests)', () => {
    const next = createInMemoryRepository()
    __setRepository(next)
    expect(getRepository()).toBe(next)
  })
})
