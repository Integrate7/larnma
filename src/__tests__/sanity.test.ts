describe('sanity', () => {
  it('jest + tsx runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('has @testing-library/jest-dom matchers', () => {
    expect(typeof expect.extend).toBe('function')
  })
})
